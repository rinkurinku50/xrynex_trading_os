import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthenticatedApi } from '@/lib/api-auth';
export const dynamic = 'force-dynamic';

const normalize = (row) => row && ({ ...row, days_done: row.daysDone, days_total: row.daysTotal, updated_at: row.updatedAt });

export async function GET() {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  return NextResponse.json(normalize(await prisma.focus.findUnique({ where: { ownerId: user.id } })));
}

export async function PATCH(req) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const b = await req.json();
  const fields = { instrument: 'instrument', session: 'session', timeframe: 'timeframe', strategy: 'strategy', bias: 'bias', days_done: 'daysDone', days_total: 'daysTotal' };
  const data = {};
  for (const [key, field] of Object.entries(fields)) if (key in b) data[field] = b[key];
  if (!Object.keys(data).length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  const row = await prisma.focus.upsert({ where: { ownerId: user.id }, create: { ownerId: user.id, ...data }, update: data });
  return NextResponse.json(normalize(row));
}
