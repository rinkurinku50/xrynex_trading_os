import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthenticatedApi } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const priorities = new Set(['High', 'Medium', 'Low', 'Bank holiday']);
const normalize = (row) => ({ ...row, event_at: row.eventAt, created_at: row.createdAt });
const validEventAt = (value) => !value || /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?$/.test(value);
const validDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export async function GET() {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const rows = await prisma.economicNews.findMany({ where: { ownerId: user.id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 50 });
  return NextResponse.json(rows.map(normalize));
}

export async function POST(request) {
  try {
    const user = await requireAuthenticatedApi();
    if (user instanceof Response) return user;
    const body = await request.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const priority = typeof body.priority === 'string' ? body.priority : 'Medium';
    const eventAt = typeof body.event_at === 'string' ? body.event_at : '';
    if (!title) return NextResponse.json({ error: 'Enter a news name.' }, { status: 400 });
    if (!priorities.has(priority)) return NextResponse.json({ error: 'Choose a valid news priority.' }, { status: 400 });
    if (!validEventAt(eventAt)) return NextResponse.json({ error: 'Choose a valid New York date and time.' }, { status: 400 });
    const row = await prisma.economicNews.create({ data: { owner: { connect: { id: user.id } }, title, priority, eventAt: eventAt || null } });
    return NextResponse.json(normalize(row), { status: 201 });
  } catch (error) {
    console.error('Economic news create failed:', error);
    return NextResponse.json({ error: 'Could not save economic news. Please try again.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const user = await requireAuthenticatedApi();
    if (user instanceof Response) return user;
    const body = await request.json();
    const date = body.date;
    const ids = Array.isArray(body.ids) ? body.ids : [];
    if (!validDate(date) || !ids.length || ids.length > 100 || !ids.every(Number.isInteger) || new Set(ids).size !== ids.length) {
      return NextResponse.json({ error: 'Choose a valid date and event group.' }, { status: 400 });
    }

    const existing = await prisma.economicNews.findMany({ where: { ownerId: user.id, id: { in: ids } } });
    if (existing.length !== ids.length) return NextResponse.json({ error: 'One or more news events were not found.' }, { status: 404 });

    const updated = await prisma.$transaction(async (tx) => {
      for (const row of existing) {
        const time = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(row.eventAt ?? '') ? row.eventAt.slice(10) : '';
        await tx.economicNews.updateMany({
          where: { id: row.id, ownerId: user.id },
          data: { eventAt: `${date}${time}` },
        });
      }
      return tx.economicNews.findMany({ where: { ownerId: user.id, id: { in: ids } } });
    });

    return NextResponse.json(updated.map(normalize));
  } catch (error) {
    console.error('Economic news date update failed:', error);
    return NextResponse.json({ error: 'Could not update the event date. Please try again.' }, { status: 500 });
  }
}
