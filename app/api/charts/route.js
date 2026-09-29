import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { driveId } from '@/lib/drive';
import { requireAuthenticatedApi } from '@/lib/api-auth';
export const dynamic = 'force-dynamic';

const normalize = (row) => row && ({
  ...row,
  drive_url: row.driveUrl,
  chart_date: row.chartDate,
  created_at: row.createdAt,
});

export async function GET() {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const rows = await prisma.chart.findMany({ where: { ownerId: user.id }, orderBy: [{ chartDate: 'desc' }, { id: 'desc' }] });
  return NextResponse.json(rows.map(normalize));
}

export async function POST(req) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const b = await req.json();
  if (!b.title || !b.drive_url) {
    return NextResponse.json({ error: 'A title and a Google Drive link are required.' }, { status: 400 });
  }
  if (!driveId(b.drive_url)) {
    return NextResponse.json({ error: 'That does not look like a Google Drive file link.' }, { status: 400 });
  }
  const row = await prisma.chart.create({
    data: {
      title: b.title,
      ownerId: user.id,
      driveUrl: b.drive_url,
      instrument: b.instrument || null,
      note: b.note || null,
      ...(b.chart_date ? { chartDate: new Date(b.chart_date) } : {}),
    },
  });
  return NextResponse.json(normalize(row), { status: 201 });
}
