import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthenticatedApi } from '@/lib/api-auth';
export const dynamic = 'force-dynamic';

const normalize = (row) => row && ({ ...row, drive_url: row.driveUrl, watched_on: row.watchedOn, created_at: row.createdAt });

export async function GET() {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const rows = await prisma.video.findMany({ where: { ownerId: user.id }, orderBy: [{ watchedOn: 'desc' }, { id: 'desc' }] });
  return NextResponse.json(rows.map(normalize));
}

export async function POST(req) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const b = await req.json();
  if (!b.title) return NextResponse.json({ error: 'Give the video a title.' }, { status: 400 });
  const row = await prisma.video.create({ data: {
    ownerId: user.id,
    title: b.title, creator: b.creator || null, topic: b.topic || null, driveUrl: b.drive_url || null, notes: b.notes || null,
    ...(b.watched_on ? { watchedOn: new Date(b.watched_on) } : {}),
  } });
  return NextResponse.json(normalize(row), { status: 201 });
}
