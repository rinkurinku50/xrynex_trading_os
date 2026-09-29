import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthenticatedApi } from '@/lib/api-auth';
export const dynamic = 'force-dynamic';

const normalize = (row) => row && ({
  ...row,
  task_date: row.taskDate,
  completed_at: row.completedAt,
  removed_at: row.removedAt,
});
const validPriorities = new Set(['High', 'Medium', 'Low']);

function parseDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

function localDateOnly(date = new Date()) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

export async function GET(request) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const requestedDate = new URL(request.url).searchParams.get('date');
  const start = requestedDate === null ? localDateOnly() : parseDateOnly(requestedDate);
  if (!start) return NextResponse.json({ error: 'Choose a valid task date.' }, { status: 400 });
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  const rows = await prisma.task.findMany({
    where: { ownerId: user.id, taskDate: { gte: start, lt: end }, removedAt: null },
    orderBy: { id: 'asc' },
  });
  return NextResponse.json(rows.map(normalize));
}

export async function POST(req) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const b = await req.json();
  if (typeof b.title !== 'string' || !b.title.trim()) {
    return NextResponse.json({ error: 'Give the task a title.' }, { status: 400 });
  }
  const priority = b.priority || 'Medium';
  if (!validPriorities.has(priority)) {
    return NextResponse.json({ error: 'Choose High, Medium, or Low priority.' }, { status: 400 });
  }
  const taskDate = b.task_date ? parseDateOnly(b.task_date) : localDateOnly();
  if (!taskDate) {
    return NextResponse.json({ error: 'Choose a valid task date.' }, { status: 400 });
  }
  const row = await prisma.task.create({ data: { ownerId: user.id, title: b.title.trim(), priority, taskDate } });
  return NextResponse.json(normalize(row), { status: 201 });
}
