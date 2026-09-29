import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthenticatedApi } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const priorities = new Set(['High', 'Medium', 'Low', 'Bank holiday']);
const normalize = (row) => ({ ...row, event_at: row.eventAt, created_at: row.createdAt });
const validEventAt = (value) => !value || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);

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
