import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthenticatedApi } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const categories = new Set(['Psychology', 'Risk Management', 'Entry', 'Exit', 'Discipline', 'Strategy']);
const severities = new Set(['Critical', 'High', 'Medium', 'Low']);
const noStore = { 'Cache-Control': 'no-store, max-age=0' };

function response(data, status = 200) {
  return NextResponse.json(data, { status, headers: noStore });
}

function normalizeMistake(row) {
  return {
    ...row,
    lastOccurred: row.lastOccurred?.toISOString() || null,
    acknowledgedAt: row.acknowledgedAt?.toISOString() || null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    recentOccurrences: row.occurrences?.map((item) => item.occurredAt.toISOString()) || [],
  };
}

function validText(value, maxLength, required = false) {
  return typeof value === 'string'
    && value.length <= maxLength
    && (!required || Boolean(value.trim()));
}

export async function GET() {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;

  const [mistakes, state, reviewPoints] = await Promise.all([
    prisma.tradingMistake.findMany({
      where: { ownerId: user.id },
      include: { occurrences: { orderBy: { occurredAt: 'desc' }, take: 5 } },
      orderBy: [{ severity: 'asc' }, { frequency: 'desc' }, { updatedAt: 'desc' }],
    }),
    prisma.mistakeMemoryState.findUnique({ where: { ownerId: user.id } }),
    prisma.mistakeReviewPoint.findMany({ where: { ownerId: user.id }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
  ]);

  return response({
    mistakes: mistakes.map(normalizeMistake),
    reviewPoints,
    lastReviewed: state?.lastReviewedAt?.toISOString() || null,
  });
}

export async function POST(request) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const body = await request.json();

  if (body.action === 'import-legacy') {
    if (!Array.isArray(body.mistakes) || body.mistakes.length > 250 || !Array.isArray(body.reviewPoints)) {
      return response({ error: 'Legacy mistake data is invalid.' }, 400);
    }
    const normalized = [];
    for (const mistake of body.mistakes) {
      if (!validText(mistake.title, 80, true)
        || !validText(mistake.description ?? '', 240)
        || !validText(mistake.preventionRule, 240, true)
        || !categories.has(mistake.category)
        || !severities.has(mistake.severity)
        || !Number.isInteger(Number(mistake.frequency))
        || Number(mistake.frequency) < 0) {
        return response({ error: 'A saved mistake has invalid fields; browser data was not removed.' }, 400);
      }
      normalized.push(mistake);
    }
    if (body.reviewPoints.some((point) => !validText(point?.text, 240, true))) {
      return response({ error: 'A saved review point is invalid; browser data was not removed.' }, 400);
    }
    const lastReviewed = body.lastReviewed ? new Date(body.lastReviewed) : null;
    if (lastReviewed && Number.isNaN(lastReviewed.getTime())) {
      return response({ error: 'The saved review timestamp is invalid; browser data was not removed.' }, 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.tradingMistake.findMany({ where: { ownerId: user.id }, select: { title: true } });
      const titles = new Set(existing.map((item) => item.title.trim().toLowerCase()));
      let importedMistakes = 0;
      let skippedMistakes = 0;
      for (const mistake of normalized) {
        const title = mistake.title.trim();
        if (titles.has(title.toLowerCase())) {
          skippedMistakes += 1;
          continue;
        }
        const lastOccurred = mistake.lastOccurred ? new Date(mistake.lastOccurred) : null;
        const row = await tx.tradingMistake.create({
          data: {
            ownerId: user.id,
            title,
            description: (mistake.description || '').trim(),
            category: mistake.category,
            severity: mistake.severity,
            preventionRule: mistake.preventionRule.trim(),
            frequency: Number(mistake.frequency),
            lastOccurred: lastOccurred && !Number.isNaN(lastOccurred.getTime()) ? lastOccurred : null,
            active: mistake.active !== false,
            acknowledgedAt: mistake.acknowledged && mistake.acknowledgedDate === new Date().toDateString() ? new Date() : null,
          },
        });
        titles.add(title.toLowerCase());
        const occurrences = Array.isArray(mistake.recentOccurrences) && mistake.recentOccurrences.length
          ? mistake.recentOccurrences
          : [mistake.lastOccurred].filter(Boolean);
        for (const value of [...new Set(occurrences)].slice(0, 5)) {
          const occurredAt = new Date(value);
          if (!Number.isNaN(occurredAt.getTime())) {
            await tx.tradingMistakeOccurrence.create({ data: { ownerId: user.id, mistakeId: row.id, occurredAt } });
          }
        }
        importedMistakes += 1;
      }

      const existingPoints = await tx.mistakeReviewPoint.findMany({ where: { ownerId: user.id }, select: { text: true } });
      const pointTexts = new Set(existingPoints.map((point) => point.text.trim().toLowerCase()));
      let importedReviewPoints = 0;
      for (const point of body.reviewPoints) {
        const text = point.text.trim();
        if (pointTexts.has(text.toLowerCase())) continue;
        await tx.mistakeReviewPoint.create({ data: { ownerId: user.id, text, sortOrder: pointTexts.size } });
        pointTexts.add(text.toLowerCase());
        importedReviewPoints += 1;
      }

      let importedReview = false;
      if (lastReviewed && !(await tx.mistakeMemoryState.findUnique({ where: { ownerId: user.id } }))) {
        await tx.mistakeMemoryState.create({ data: { ownerId: user.id, lastReviewedAt: lastReviewed } });
        importedReview = true;
      }
      return { importedMistakes, skippedMistakes, importedReviewPoints, importedReview };
    });
    return response(result);
  }

  if (body.action === 'create-mistake') {
    if (!validText(body.title, 80, true)
      || !validText(body.description ?? '', 240)
      || !validText(body.preventionRule, 240, true)
      || !categories.has(body.category)
      || !severities.has(body.severity)) {
      return response({ error: 'Check the mistake details and try again.' }, 400);
    }
    const mistake = await prisma.tradingMistake.create({
      data: {
        ownerId: user.id,
        title: body.title.trim(),
        description: (body.description ?? '').trim(),
        category: body.category,
        severity: body.severity,
        preventionRule: body.preventionRule.trim(),
      },
      include: { occurrences: true },
    });
    return response(normalizeMistake(mistake), 201);
  }

  if (body.action === 'create-review-point') {
    if (!validText(body.text, 240, true)) return response({ error: 'Enter a review point up to 240 characters.' }, 400);
    const reviewPoint = await prisma.mistakeReviewPoint.create({
      data: { ownerId: user.id, text: body.text.trim() },
    });
    return response(reviewPoint, 201);
  }

  if (body.action === 'review') {
    const state = await prisma.mistakeMemoryState.upsert({
      where: { ownerId: user.id },
      create: { ownerId: user.id, lastReviewedAt: new Date() },
      update: { lastReviewedAt: new Date() },
    });
    return response({ lastReviewed: state.lastReviewedAt.toISOString() });
  }

  if (body.action === 'record-occurrence') {
    if (typeof body.id !== 'string' || !body.id) return response({ error: 'Choose a mistake to record.' }, 400);
    const updated = await prisma.$transaction(async (tx) => {
      const where = { id_ownerId: { id: body.id, ownerId: user.id } };
      const mistake = await tx.tradingMistake.findUnique({ where });
      if (!mistake) return null;
      const now = new Date();
      await tx.tradingMistakeOccurrence.create({ data: { mistakeId: mistake.id, ownerId: user.id, occurredAt: now } });
      return tx.tradingMistake.update({
        where,
        data: { frequency: { increment: 1 }, lastOccurred: now, acknowledgedAt: null },
        include: { occurrences: { orderBy: { occurredAt: 'desc' }, take: 5 } },
      });
    });
    return updated ? response(normalizeMistake(updated)) : response({ error: 'Mistake not found.' }, 404);
  }

  return response({ error: 'Choose a valid action.' }, 400);
}

export async function PATCH(request) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const body = await request.json();

  if (body.type === 'mistake' && typeof body.id === 'string') {
    const data = {};
    for (const field of ['title', 'description', 'preventionRule']) {
      if (field in body) {
        const limit = field === 'title' ? 80 : 240;
        if (!validText(body[field], limit, field !== 'description')) return response({ error: `Check the ${field} value.` }, 400);
        data[field] = body[field].trim();
      }
    }
    if ('category' in body) {
      if (!categories.has(body.category)) return response({ error: 'Choose a valid category.' }, 400);
      data.category = body.category;
    }
    if ('severity' in body) {
      if (!severities.has(body.severity)) return response({ error: 'Choose a valid severity.' }, 400);
      data.severity = body.severity;
    }
    if ('active' in body) {
      if (typeof body.active !== 'boolean') return response({ error: 'Choose a valid active state.' }, 400);
      data.active = body.active;
    }
    if ('acknowledged' in body) {
      if (typeof body.acknowledged !== 'boolean') return response({ error: 'Choose a valid review state.' }, 400);
      data.acknowledgedAt = body.acknowledged ? new Date() : null;
    }
    if (!Object.keys(data).length) return response({ error: 'Nothing to update.' }, 400);

    const where = { id_ownerId: { id: body.id, ownerId: user.id } };
    try {
      await prisma.tradingMistake.update({ where, data });
      const mistake = await prisma.tradingMistake.findUnique({
        where,
        include: { occurrences: { orderBy: { occurredAt: 'desc' }, take: 5 } },
      });
      return response(normalizeMistake(mistake));
    } catch (error) {
      if (error.code === 'P2025') return response({ error: 'Mistake not found.' }, 404);
      throw error;
    }
  }

  if (body.type === 'review-point' && typeof body.id === 'string') {
    if (!validText(body.text, 240, true)) return response({ error: 'Enter a review point up to 240 characters.' }, 400);
    const result = await prisma.mistakeReviewPoint.updateMany({
      where: { id: body.id, ownerId: user.id },
      data: { text: body.text.trim() },
    });
    if (!result.count) return response({ error: 'Review point not found.' }, 404);
    return response(await prisma.mistakeReviewPoint.findFirst({ where: { id: body.id, ownerId: user.id } }));
  }

  return response({ error: 'Choose a valid record to update.' }, 400);
}

export async function DELETE(request) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const body = await request.json();
  if (typeof body.id !== 'string' || !body.id) return response({ error: 'Choose a record to delete.' }, 400);

  if (body.type === 'mistake') {
    const result = await prisma.tradingMistake.deleteMany({ where: { id: body.id, ownerId: user.id } });
    return result.count ? response({ deleted: true }) : response({ error: 'Mistake not found.' }, 404);
  }
  if (body.type === 'review-point') {
    const result = await prisma.mistakeReviewPoint.deleteMany({ where: { id: body.id, ownerId: user.id } });
    return result.count ? response({ deleted: true }) : response({ error: 'Review point not found.' }, 404);
  }
  return response({ error: 'Choose a valid record to delete.' }, 400);
}