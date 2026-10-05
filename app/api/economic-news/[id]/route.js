import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthenticatedApi } from '@/lib/api-auth';

const priorities = new Set(['High', 'Medium', 'Low', 'Bank holiday']);

export async function DELETE(request, { params }) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid news item.' }, { status: 400 });
  await prisma.economicNews.deleteMany({ where: { id, ownerId: user.id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request, { params }) {
  try {
    const user = await requireAuthenticatedApi();
    if (user instanceof Response) return user;
    const id = Number((await params).id);
    const body = await request.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const priority = typeof body.priority === 'string' ? body.priority : 'Medium';
    const eventAt = typeof body.event_at === 'string' ? body.event_at : '';
    if (!Number.isInteger(id) || !title || !priorities.has(priority) || (eventAt && !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?$/.test(eventAt))) {
      return NextResponse.json({ error: 'Enter a valid news name, priority, and New York date/time.' }, { status: 400 });
    }
    const data = { title, priority, eventAt: eventAt || null };
    const row = await prisma.economicNews.updateMany({ where: { id, ownerId: user.id }, data });
    if (!row.count) return NextResponse.json({ error: 'News item not found.' }, { status: 404 });
    const updated = await prisma.economicNews.findFirst({ where: { id, ownerId: user.id } });
    return NextResponse.json({ ...updated, event_at: updated.eventAt, created_at: updated.createdAt });
  } catch (error) {
    console.error('Economic news update failed:', error);
    return NextResponse.json({ error: 'Could not save news order. Please try again.' }, { status: 500 });
  }
}
