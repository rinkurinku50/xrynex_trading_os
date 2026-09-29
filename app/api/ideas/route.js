import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthenticatedApi } from '@/lib/api-auth';
export const dynamic = 'force-dynamic';

const normalize = (row) => row && ({ ...row, idea_date: row.ideaDate, created_at: row.createdAt });

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
  const b = await req.json();
  if (!b.title) return NextResponse.json({ error: 'Give the idea a title.' }, { status: 400 });
  const row = await prisma.idea.create({
    data: {
      ownerId: user.id,
      title: b.title,
      tag: b.tag || undefined,
      note: b.note || null,
      status: b.status || undefined,
      ...(b.idea_date ? { ideaDate: new Date(b.idea_date) } : {}),
    },
  });
  return NextResponse.json(normalize(row), { status: 201 });
}
