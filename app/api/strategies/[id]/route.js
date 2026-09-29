import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthenticatedApi } from '@/lib/api-auth';

const normalize = (row) => row && ({ ...row, drive_url: row.driveUrl, created_at: row.createdAt });

export async function PATCH(req, { params }) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: 'Invalid strategy ID.' }, { status: 400 });
  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  const fields = {
    code: 'code',
    name: 'name',
    status: 'status',
    description: 'description',
    rules: 'rules',
    drive_url: 'driveUrl',
    show_in_nav: 'showInNav',
    is_favorite: 'isFavorite',
  };
  const data = {};
  for (const [key, field] of Object.entries(fields)) {
    if (key in b) {
      if (key === 'show_in_nav' || key === 'is_favorite') {
        if (typeof b[key] !== 'boolean') return NextResponse.json({ error: `${key} must be true or false.` }, { status: 400 });
        data[field] = b[key];
      } else {
        data[field] = b[key];
      }
    }
  }
  if (!Object.keys(data).length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  const result = await prisma.strategy.updateMany({ where: { id, ownerId: user.id }, data });
  if (!result.count) return NextResponse.json({ error: 'Strategy not found.' }, { status: 404 });
  return NextResponse.json(normalize(await prisma.strategy.findFirst({ where: { id, ownerId: user.id } })));
}

export async function DELETE(_req, { params }) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: 'Invalid strategy ID.' }, { status: 400 });
  await prisma.strategy.deleteMany({ where: { id, ownerId: user.id } });
  return NextResponse.json({ ok: true });
}
