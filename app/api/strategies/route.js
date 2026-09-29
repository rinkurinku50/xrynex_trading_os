import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthenticatedApi } from '@/lib/api-auth';
export const dynamic = 'force-dynamic';

const normalize = (row) => row && ({ ...row, drive_url: row.driveUrl, created_at: row.createdAt });

export async function GET() {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const rows = await prisma.strategy.findMany({ where: { ownerId: user.id }, orderBy: { code: 'asc' } });
  return NextResponse.json(rows.map(normalize));
}

export async function POST(req) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: 'Give the strategy a name.' }, { status: 400 });
  const code = b.code || String((await prisma.strategy.count({ where: { ownerId: user.id } })) + 1).padStart(2, '0');
  const row = await prisma.strategy.create({
    data: {
      ownerId: user.id,
      code,
      name: b.name,
      status: b.status || undefined,
      description: b.description || null,
      rules: b.rules || null,
      driveUrl: b.drive_url || null,
      showInNav: Boolean(b.show_in_nav),
    },
  });
  return NextResponse.json(normalize(row), { status: 201 });
}
