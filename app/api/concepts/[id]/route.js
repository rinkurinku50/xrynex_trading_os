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
  const fields = { name: 'name', icon: 'icon', subtitle: 'subtitle', body: 'body', sort_order: 'sortOrder', position_x: 'positionX', position_y: 'positionY', card_width: 'cardWidth', card_height: 'cardHeight', show_in_nav: 'showInNav', is_favorite: 'isFavorite' };

  for (const [key, field] of Object.entries(fields)) {
    if (key in body) {
      if (key === 'is_favorite' || key === 'show_in_nav') {
        if (typeof body[key] !== 'boolean') return NextResponse.json({ error: `${key} must be true or false.` }, { status: 400 });
        data[field] = body[key];
      } else if (key === 'position_x' || key === 'position_y') {
        const maximum = key === 'position_x' ? 1 : 100000;
        if (body[key] !== null && (typeof body[key] !== 'number' || !Number.isFinite(body[key]) || body[key] < 0 || body[key] > maximum)) {
          return NextResponse.json({ error: `${key} must be a valid non-negative number or null.` }, { status: 400 });
        }
        data[field] = body[key];
      } else if (key === 'card_width' || key === 'card_height') {
        const minimum = key === 'card_width' ? 240 : 220;
        const maximum = key === 'card_width' ? 1200 : 4000;
        if (body[key] !== null && (!Number.isInteger(body[key]) || body[key] < minimum || body[key] > maximum)) {
          return NextResponse.json({ error: `${key} must be an integer between ${minimum} and ${maximum}, or null.` }, { status: 400 });
        }
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
