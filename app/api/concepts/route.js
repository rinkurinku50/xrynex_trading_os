import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthenticatedApi } from '@/lib/api-auth';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  return NextResponse.json(await prisma.concept.findMany({ where: { ownerId: user.id }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }));
}

export async function POST(req) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: 'Give the concept a name.' }, { status: 400 });
  const sortOrder = b.sort_order ?? ((await prisma.concept.aggregate({ where: { ownerId: user.id }, _max: { sortOrder: true } }))._max.sortOrder ?? 0) + 1;
  const row = await prisma.concept.create({
    data: {
      name: b.name,
      ownerId: user.id,
      icon: b.icon || 'book',
      subtitle: b.subtitle || null,
      body: b.body || null,
      sortOrder,
      showInNav: Boolean(b.show_in_nav),
    }
  });
  return NextResponse.json(row, { status: 201 });
}
