import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthenticatedApi } from '@/lib/api-auth';
import { driveImage } from '@/lib/drive';
import { extractCalendarEvents } from '@/lib/calendar-ocr.mjs';

export const dynamic = 'force-dynamic';

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
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const body = await request.json();
  const imageUrl = typeof body.image_url === 'string' ? body.image_url.trim() : '';
  const requestedOpacity = Number(body.overlay_opacity);
  const overlayOpacity = Number.isFinite(requestedOpacity)
    ? Math.max(0, Math.min(60, Math.round(requestedOpacity)))
    : 15;

  if (imageUrl && !validImageUrl(imageUrl)) {
    return NextResponse.json({ error: 'Enter a valid http or https image or Google Drive URL.' }, { status: 400 });
  }

  const previous = await prisma.economicCalendarScreenshot.findUnique({ where: { ownerId: user.id } });
  const replaceEvents = Boolean(imageUrl && (previous?.imageUrl !== imageUrl || body.force_scan === true));
  let extraction = null;
  if (replaceEvents) {
    try {
      extraction = await extractCalendarEvents(driveImage(imageUrl, 'w1600') || imageUrl);
    } catch (error) {
      return NextResponse.json({ error: error.message || 'Could not scan the calendar image.' }, { status: 422 });
    }
  }

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
      if (replaceEvents) {
        const deleted = await tx.economicNews.deleteMany({ where: { ownerId: user.id } });
        replacedCount = deleted.count;
      }
      const existing = replaceEvents ? [] : await tx.economicNews.findMany({
        where: { ownerId: user.id },
        select: { title: true, priority: true, eventAt: true },
      });
      const eventKey = (event) => `${event.title.trim().toLowerCase()}|${event.priority}|${event.eventAt ?? event.event_at ?? ''}`;
      const knownEvents = new Set(existing.map(eventKey));

      for (const event of extraction.events) {
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

  return NextResponse.json({
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
}
