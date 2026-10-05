import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthenticatedApi } from '@/lib/api-auth';
import { driveImage } from '@/lib/drive';
import { extractCalendarEvents } from '@/lib/calendar-ocr.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function safeErrorMessage(error) {
  return String(error?.message ?? error ?? 'Unknown error')
    .replace(/https?:\/\/[^\s)]+/g, '[redacted URL]')
    .slice(0, 500);
}

function logOperation(operationId, event, details = {}) {
  console.info('[calendar-screenshot]', JSON.stringify({
    operation_id: operationId,
    event,
    timestamp: new Date().toISOString(),
    ...details,
  }));
}

function getOperationId(request) {
  const requestedId = request.headers.get('x-operation-id');
  return /^[a-z0-9_-]{8,80}$/i.test(requestedId ?? '') ? requestedId : randomUUID();
}

function getOcrDiagnosticCode(error, failedStep) {
  const message = String(error?.message ?? error ?? '');
  if (/OCR worker initialization timed out/i.test(message)) return 'OCR_WORKER_START_TIMEOUT';
  if (/OCR recognition timed out/i.test(message)) return 'OCR_RECOGNITION_TIMEOUT';
  if (/image (?:host lookup|download) timed out/i.test(message)) return 'IMAGE_DOWNLOAD_TIMEOUT';
  if (/packaged English OCR model is missing/i.test(message)) return 'OCR_MODEL_MISSING';
  if (/invalid response/i.test(message)) return 'OCR_RESPONSE_INVALID';
  if (failedStep?.startsWith('image_')) return 'IMAGE_SOURCE_FAILURE';
  if (failedStep?.startsWith('ocr_worker')) return 'OCR_WORKER_FAILURE';
  return 'OCR_PROCESSING_FAILURE';
}

function respond(operationId, startedAt, status, payload) {
  logOperation(operationId, 'api_response', {
    http_status: status,
    error_message: payload.error ?? null,
    duration_ms: Date.now() - startedAt,
  });
  return NextResponse.json({ ...payload, operation_id: operationId }, {
    status,
    headers: { 'x-operation-id': operationId },
  });
}

function validImageUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function GET() {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const screenshot = await prisma.economicCalendarScreenshot.findUnique({ where: { ownerId: user.id } });
  return NextResponse.json({ image_url: screenshot?.imageUrl ?? '', overlay_opacity: screenshot?.overlayOpacity ?? 15, updated_at: screenshot?.updatedAt?.toISOString() ?? null });
}

export async function PUT(request) {
  const operationId = getOperationId(request);
  const startedAt = Date.now();
  let stage = 'authentication';
  let lastOcrStep = null;
  let firstOcrFailureStep = null;
  let ocrDiagnosticMessage = null;
  logOperation(operationId, 'save_operation_started');

  try {
    logOperation(operationId, 'authentication_started');
    const user = await requireAuthenticatedApi();
    if (user instanceof Response) {
      user.headers.set('x-operation-id', operationId);
      logOperation(operationId, 'authentication_failed', { http_status: user.status });
      logOperation(operationId, 'api_response', {
        http_status: user.status,
        error_message: 'Authentication required.',
        duration_ms: Date.now() - startedAt,
      });
      return user;
    }
    logOperation(operationId, 'authentication_completed');

    stage = 'request_parse';
    let body;
    try {
      body = await request.json();
    } catch {
      return respond(operationId, startedAt, 400, {
        error: 'Request body must contain valid JSON.',
        failed_stage: stage,
      });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return respond(operationId, startedAt, 400, {
        error: 'Request body must be a JSON object.',
        failed_stage: stage,
      });
    }

    const imageUrl = typeof body.image_url === 'string' ? body.image_url.trim() : '';
    const requestedOpacity = Number(body.overlay_opacity);
    const overlayOpacity = Number.isFinite(requestedOpacity)
      ? Math.max(0, Math.min(60, Math.round(requestedOpacity)))
      : 15;

    stage = 'image_validation';
    if (imageUrl && !validImageUrl(imageUrl)) {
      logOperation(operationId, 'image_validation_failed');
      return respond(operationId, startedAt, 400, {
        error: 'Enter a valid http or https image or Google Drive URL.',
        failed_stage: stage,
      });
    }
    if (imageUrl) logOperation(operationId, 'image_upload_started');

    stage = 'screenshot_lookup';
    const previous = await prisma.economicCalendarScreenshot.findUnique({ where: { ownerId: user.id } });
    logOperation(operationId, 'screenshot_lookup_completed', { found: Boolean(previous) });
    const replaceEvents = Boolean(imageUrl && (previous?.imageUrl !== imageUrl || body.force_scan === true));
    let extraction = null;

    if (replaceEvents) {
      stage = 'ocr';
      const ocrStartedAt = Date.now();
      logOperation(operationId, 'ocr_request_started');
      extraction = await extractCalendarEvents(driveImage(imageUrl, 'w1600') || imageUrl, {
        onStage: (event, details) => {
          lastOcrStep = event;
          if (!firstOcrFailureStep && /failed|missing|invalid/.test(event)) {
            firstOcrFailureStep = event;
            ocrDiagnosticMessage = details.error ? safeErrorMessage(details.error) : event;
          }
          const safeDetails = {
            ...details,
            ...(details.error ? { error: safeErrorMessage(details.error) } : {}),
          };
          logOperation(operationId, event, safeDetails);
          if (event === 'image_download_completed') {
            logOperation(operationId, 'image_upload_completed', {
              bytes: details.bytes,
              duration_ms: details.duration_ms,
            });
          }
        },
      });
      logOperation(operationId, 'ocr_request_completed', {
        duration_ms: Date.now() - ocrStartedAt,
        extracted_count: extraction.events.length,
        skipped_count: extraction.skipped,
        unclassified_count: extraction.unclassified,
      });
    } else {
      logOperation(operationId, 'ocr_request_skipped', { reason: 'image_unchanged' });
    }

    stage = 'ocr_validation';
    logOperation(operationId, 'scheduler_data_generation_started');
    const extractedEvents = extraction?.events ?? [];
    if (!Array.isArray(extractedEvents) || extractedEvents.some((event) => (
      typeof event.title !== 'string'
      || !event.title.trim()
      || !['High', 'Medium', 'Low', 'Bank holiday'].includes(event.priority)
      || typeof event.event_at !== 'string'
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(event.event_at)
    ))) {
      logOperation(operationId, 'scheduler_data_generation_failed', { reason: 'invalid_ocr_event_data' });
      throw new Error('OCR extraction returned invalid scheduler event data.');
    }
    if (extraction && extractedEvents.length === 0) {
      logOperation(operationId, 'scheduler_data_generation_failed', { reason: 'no_schedulable_events' });
      throw new Error('OCR found no schedulable events; existing Scheduler data was preserved.');
    }
    logOperation(operationId, 'scheduler_data_generation_completed', { event_count: extractedEvents.length });

    stage = 'scheduler_persistence';
    logOperation(operationId, 'scheduler_save_started');
    const result = await prisma.$transaction(async (tx) => {
      const screenshot = await tx.economicCalendarScreenshot.upsert({
        where: { ownerId: user.id },
        create: { ownerId: user.id, imageUrl: imageUrl || null, overlayOpacity },
        update: { imageUrl: imageUrl || null, overlayOpacity },
      });
      const createdEvents = [];
      let duplicateCount = 0;
      let replacedCount = 0;

      if (extraction) {
        const deleted = await tx.economicNews.deleteMany({ where: { ownerId: user.id } });
        replacedCount = deleted.count;
        const knownEvents = new Set();
        const eventKey = (event) => `${event.title.trim().toLowerCase()}|${event.priority}|${event.event_at}`;

        for (const event of extractedEvents) {
          const key = eventKey(event);
          if (knownEvents.has(key)) {
            duplicateCount += 1;
            continue;
          }
          const created = await tx.economicNews.create({
            data: {
              owner: { connect: { id: user.id } },
              title: event.title,
              priority: event.priority,
              eventAt: event.event_at,
            },
          });
          knownEvents.add(key);
          createdEvents.push({ ...created, event_at: created.eventAt, created_at: created.createdAt });
        }
      }

      return { screenshot, createdEvents, duplicateCount, replacedCount };
    });
    logOperation(operationId, 'scheduler_save_completed', {
      created_count: result.createdEvents.length,
      duplicate_count: result.duplicateCount,
      replaced_count: result.replacedCount,
    });
    logOperation(operationId, 'save_operation_completed', {
      status: 'success',
      duration_ms: Date.now() - startedAt,
    });

    return respond(operationId, startedAt, 200, {
      image_url: result.screenshot.imageUrl ?? '',
      overlay_opacity: result.screenshot.overlayOpacity,
      scanned_count: extraction?.events.length ?? 0,
      unclassified_count: extraction?.unclassified ?? 0,
      skipped_count: extraction?.skipped ?? 0,
      duplicate_count: result.duplicateCount,
      replaced_count: result.replacedCount,
      events_replaced: Boolean(extraction && replaceEvents),
      created_events: result.createdEvents,
    });
  } catch (error) {
    const errorMessage = safeErrorMessage(error);
    const isOcrFailure = stage === 'ocr' || stage === 'ocr_validation';
    const failedStep = stage === 'ocr' ? firstOcrFailureStep ?? lastOcrStep : stage;
    const diagnosticCode = isOcrFailure ? getOcrDiagnosticCode(error, failedStep) : null;
    const userMessage = isOcrFailure
      ? 'OCR Failed: Unable to process the uploaded image. Please try again.'
      : 'Unable to save the calendar. Please try again.';
    logOperation(operationId, 'save_operation_failed', {
      failed_stage: stage,
      failed_step: failedStep,
      diagnostic_code: diagnosticCode,
      duration_ms: Date.now() - startedAt,
      error_name: error?.name ?? 'Error',
      error_code: error?.code ?? null,
      error_message: errorMessage,
    });
    return respond(operationId, startedAt, isOcrFailure ? 422 : 500, {
      error: userMessage,
      failed_stage: stage,
      failed_step: failedStep,
      diagnostic_code: diagnosticCode,
      ...(isOcrFailure ? { diagnostic_message: ocrDiagnosticMessage ?? errorMessage } : {}),
    });
  }
}
