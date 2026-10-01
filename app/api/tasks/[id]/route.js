import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthenticatedApi } from '@/lib/api-auth';

const normalize = (row) => row && ({
  ...row,
  task_date: row.taskDate,
  reminder_time: row.reminderTime,
  completed_at: row.completedAt,
  removed_at: row.removedAt,
});
const validPriorities = new Set(['High', 'Medium', 'Low']);

export async function PATCH(req, { params }) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: 'Invalid task ID.' }, { status: 400 });
  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  const data = {};
  if ('done' in b) {
    data.done = Boolean(b.done);
    data.completedAt = data.done ? new Date() : null;
  }
  if ('removed' in b) {
    if (typeof b.removed !== 'boolean') {
      return NextResponse.json({ error: 'Removed must be true or false.' }, { status: 400 });
    }
    data.removedAt = b.removed ? new Date() : null;
  }
  if ('priority' in b) {
    if (!validPriorities.has(b.priority)) {
      return NextResponse.json({ error: 'Choose High, Medium, or Low priority.' }, { status: 400 });
    }
    data.priority = b.priority;
  }
  if ('reminder_time' in b) {
    if (b.reminder_time !== null && (typeof b.reminder_time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.reminder_time))) {
      return NextResponse.json({ error: 'Choose a valid reminder time.' }, { status: 400 });
    }
    data.reminderTime = b.reminder_time;
  }
  if ('task_date' in b) {
    if (typeof b.task_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.task_date)) {
      return NextResponse.json({ error: 'Choose a valid task date.' }, { status: 400 });
    }
    const taskDate = new Date(`${b.task_date}T00:00:00.000Z`);
    if (Number.isNaN(taskDate.getTime())) {
      return NextResponse.json({ error: 'Choose a valid task date.' }, { status: 400 });
    }
    data.taskDate = taskDate;
  }
  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }
  const result = await prisma.task.updateMany({ where: { id, ownerId: user.id }, data });
  if (!result.count) return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
  const row = await prisma.task.findFirst({ where: { id, ownerId: user.id } });
  return NextResponse.json(normalize(row));
}

export async function DELETE(req, { params }) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: 'Invalid task ID.' }, { status: 400 });
  const permanent = new URL(req.url).searchParams.get('permanent') === 'true';
  const result = await prisma.task.deleteMany({
    where: { id, ownerId: user.id, ...(!permanent ? { removedAt: { not: null } } : {}) },
  });
  if (!result.count) return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
