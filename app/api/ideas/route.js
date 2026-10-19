import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthenticatedApi } from '@/lib/api-auth';
export const dynamic = 'force-dynamic';

const normalize = (row) => row && ({ ...row, idea_date: row.ideaDate, created_at: row.createdAt });

function parseIdeaDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

export async function GET(req) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const tag = new URL(req.url).searchParams.get('tag');
  const rows = await prisma.idea.findMany({ where: { ownerId: user.id, ...(tag ? { tag } : {}) }, orderBy: [{ ideaDate: 'desc' }, { id: 'desc' }] });
  return NextResponse.json(rows.map(normalize));
}

export async function POST(req) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  if (typeof b.title !== 'string' || !b.title.trim()) return NextResponse.json({ error: 'Give the idea a title.' }, { status: 400 });
  const ideaDate = b.idea_date === undefined ? new Date() : parseIdeaDate(b.idea_date);
  if (!ideaDate) return NextResponse.json({ error: 'Choose a valid idea date.' }, { status: 400 });
  const row = await prisma.idea.create({
    data: {
      ownerId: user.id,
      title: b.title.trim(),
      tag: b.tag || undefined,
      note: b.note || null,
      status: b.status || undefined,
      ideaDate,
    },
  });
  return NextResponse.json(normalize(row), { status: 201 });
}
