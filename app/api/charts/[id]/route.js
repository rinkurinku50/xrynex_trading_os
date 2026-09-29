import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthenticatedApi } from '@/lib/api-auth';

const normalize = (row) => row && ({ ...row, drive_url: row.driveUrl, chart_date: row.chartDate, created_at: row.createdAt });

export async function PATCH(req, { params }) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const b = await req.json();
  const fields = { title: 'title', drive_url: 'driveUrl', instrument: 'instrument', note: 'note', chart_date: 'chartDate' };
  const data = {};
  for (const [key, field] of Object.entries(fields)) if (key in b) data[field] = key === 'chart_date' ? new Date(b[key]) : b[key];
  if (!Object.keys(data).length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  const result = await prisma.chart.updateMany({ where: { id: Number(params.id), ownerId: user.id }, data });
  if (!result.count) return NextResponse.json({ error: 'Chart not found.' }, { status: 404 });
  const row = await prisma.chart.findFirst({ where: { id: Number(params.id), ownerId: user.id } });
  return NextResponse.json(normalize(row));
}

export async function DELETE(_req, { params }) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  await prisma.chart.deleteMany({ where: { id: Number(params.id), ownerId: user.id } });
  return NextResponse.json({ ok: true });
}
