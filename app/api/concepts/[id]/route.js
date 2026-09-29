import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthenticatedApi } from '@/lib/api-auth';

export async function PATCH(req, { params }) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: 'Invalid concept ID.' }, { status: 400 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  const data = {};
  const fields = { name: 'name', icon: 'icon', subtitle: 'subtitle', body: 'body', sort_order: 'sortOrder', show_in_nav: 'showInNav', is_favorite: 'isFavorite' };

  for (const [key, field] of Object.entries(fields)) {
    if (key in body) {
      if (key === 'is_favorite' || key === 'show_in_nav') {
        if (typeof body[key] !== 'boolean') return NextResponse.json({ error: `${key} must be true or false.` }, { status: 400 });
        data[field] = body[key];
      } else {
        data[field] = key === 'sort_order' ? Number(body[key]) : body[key] || null;
      }
    }
  }

  if (!data.name && 'name' in body) {
    return NextResponse.json({ error: 'Give the concept a name.' }, { status: 400 });
  }
  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  try {
    const result = await prisma.concept.updateMany({ where: { id, ownerId: user.id }, data });
    if (!result.count) return NextResponse.json({ error: 'Concept not found.' }, { status: 404 });
    const row = await prisma.concept.findFirst({ where: { id, ownerId: user.id } });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: 'Concept not found.' }, { status: 404 });
  }
}

export async function DELETE(_req, { params }) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: 'Invalid concept ID.' }, { status: 400 });
  try {
    const result = await prisma.concept.deleteMany({ where: { id, ownerId: user.id } });
    if (!result.count) return NextResponse.json({ error: 'Concept not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Concept not found.' }, { status: 404 });
  }
}
