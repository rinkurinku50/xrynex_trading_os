import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthenticatedApi } from '@/lib/api-auth';

const normalize = (row) => row && ({ ...row, idea_date: row.ideaDate, created_at: row.createdAt });

function parseIdeaDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

export async function PATCH(req, { params }) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: 'Invalid idea ID.' }, { status: 400 });
  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  const fields = { title: 'title', tag: 'tag', note: 'note', status: 'status', idea_date: 'ideaDate' };
  const data = {};
  for (const [key, field] of Object.entries(fields)) {
    if (!(key in b)) continue;
    if (key === 'idea_date') {
      const ideaDate = parseIdeaDate(b[key]);
      if (!ideaDate) return NextResponse.json({ error: 'Choose a valid idea date.' }, { status: 400 });
      data[field] = ideaDate;
    } else if (key === 'title') {
      if (typeof b[key] !== 'string' || !b[key].trim()) return NextResponse.json({ error: 'Give the idea a title.' }, { status: 400 });
      data[field] = b[key].trim();
    } else {
      data[field] = b[key];
    }
  }
  if (!Object.keys(data).length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  const result = await prisma.idea.updateMany({ where: { id, ownerId: user.id }, data });
  if (!result.count) return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });
  return NextResponse.json(normalize(await prisma.idea.findFirst({ where: { id, ownerId: user.id } })));
}

export async function DELETE(_req, { params }) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: 'Invalid idea ID.' }, { status: 400 });
  await prisma.idea.deleteMany({ where: { id, ownerId: user.id } });
  return NextResponse.json({ ok: true });
}
