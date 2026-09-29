import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthenticatedApi } from '@/lib/api-auth';

const normalize = (row) => row && ({ ...row, drive_url: row.driveUrl, watched_on: row.watchedOn, created_at: row.createdAt });

export async function PATCH(req, { params }) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: 'Invalid video ID.' }, { status: 400 });

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const fields = { title: 'title', creator: 'creator', topic: 'topic', drive_url: 'driveUrl', notes: 'notes', is_favorite: 'isFavorite', watched_on: 'watchedOn' };
  const data = {};
  for (const [key, field] of Object.entries(fields)) {
    if (!(key in b)) continue;
    if (key === 'is_favorite') {
      if (typeof b[key] !== 'boolean') {
        return NextResponse.json({ error: 'The is_favorite field must be a boolean.' }, { status: 400 });
      }
      data[field] = b[key];
      continue;
    }
    if (key === 'watched_on') {
      const date = typeof b[key] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b[key])
        ? new Date(`${b[key]}T00:00:00.000Z`)
        : null;
      if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== b[key]) {
        return NextResponse.json({ error: 'Choose a valid watched-on date.' }, { status: 400 });
      }
      data[field] = date;
    } else {
      if (b[key] !== null && typeof b[key] !== 'string') {
        return NextResponse.json({ error: `The ${key} field must be text.` }, { status: 400 });
      }
      data[field] = b[key];
    }
  }
  if (typeof data.title === 'string' && !data.title.trim()) {
    return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
  }
  if (typeof data.driveUrl === 'string' && !data.driveUrl.trim()) {
    return NextResponse.json({ error: 'Video link is required.' }, { status: 400 });
  }
  if (typeof data.title === 'string') data.title = data.title.trim();
  if (typeof data.driveUrl === 'string') data.driveUrl = data.driveUrl.trim();
  if (!Object.keys(data).length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  const result = await prisma.video.updateMany({ where: { id, ownerId: user.id }, data });
  if (!result.count) return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
  return NextResponse.json(normalize(await prisma.video.findFirst({ where: { id, ownerId: user.id } })));
}

export async function DELETE(_req, { params }) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: 'Invalid video ID.' }, { status: 400 });
  await prisma.video.deleteMany({ where: { id, ownerId: user.id } });
  return NextResponse.json({ ok: true });
}
