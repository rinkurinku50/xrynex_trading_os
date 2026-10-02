import { NextResponse } from 'next/server';
import { requireAuthenticatedApi } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import { DEFAULT_REMINDER_SETTINGS, DEFAULT_USER_PREFERENCES } from '@/lib/workspace-defaults';

export const dynamic = 'force-dynamic';

const allowedKeys = new Set([
  'routine-tasks',
  'routine-done',
  'routine-auto-done',
  'routine-categories',
  'routine-accent',
  'routine-theme',
  'reminder-settings',
  'reminder-acknowledged',
  'trading-plan-checklist',
  'economic-news-order',
]);
const noStore = { 'Cache-Control': 'no-store, max-age=0' };

function response(data, status = 200) {
  return NextResponse.json(data, { status, headers: noStore });
}

export async function GET(request) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;

  const requested = new URL(request.url).searchParams.get('keys');
  const keys = requested ? requested.split(',') : [...allowedKeys];
  if (!keys.length || keys.some((key) => !allowedKeys.has(key))) {
    return response({ error: 'Choose valid preference keys.' }, 400);
  }

  const rows = await prisma.userPreference.findMany({
    where: { ownerId: user.id, key: { in: keys } },
  });
  const values = {};
  for (const row of rows) {
    try {
      values[row.key] = JSON.parse(row.value);
    } catch {
      return response({ error: `Saved preference ${row.key} is invalid.` }, 500);
    }
  }
  return response({ values });
}

export async function PUT(request) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;

  let body;
  try {
    body = await request.json();
  } catch {
    return response({ error: 'Invalid preference data.' }, 400);
  }
  if (!body?.values || typeof body.values !== 'object' || Array.isArray(body.values)) {
    return response({ error: 'Provide preference values to save.' }, 400);
  }

  const entries = Object.entries(body.values);
  if (!entries.length || entries.some(([key]) => !allowedKeys.has(key))) {
    return response({ error: 'Choose valid preference keys.' }, 400);
  }

  const records = [];
  for (const [key, value] of entries) {
    if (key === 'reminder-settings' && (!value || typeof value !== 'object' || Array.isArray(value))) {
      return response({ error: 'Reminder settings must be an object.' }, 400);
    }
    const normalizedValue = key === 'reminder-settings'
      ? { ...DEFAULT_REMINDER_SETTINGS, ...value }
      : value;
    let serialized;
    try {
      serialized = JSON.stringify(normalizedValue);
    } catch {
      return response({ error: `Preference ${key} is not valid JSON data.` }, 400);
    }
    if (serialized === undefined || serialized.length > 200_000) {
      return response({ error: `Preference ${key} is empty or too large.` }, 400);
    }
    records.push({ key, value: serialized });
  }

  await prisma.$transaction(records.map(({ key, value }) => prisma.userPreference.upsert({
    where: { ownerId_key: { ownerId: user.id, key } },
    create: { ownerId: user.id, key, value },
    update: { value },
  })));

  return response({ saved: records.map(({ key }) => key) });
}

export async function POST(request) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;

  let body;
  try {
    body = await request.json();
  } catch {
    return response({ error: 'Invalid preference initialization request.' }, 400);
  }
  const keys = body?.action === 'initialize' ? body.keys : null;
  if (!Array.isArray(keys) || !keys.length || keys.some((key) => !allowedKeys.has(key) || !Object.hasOwn(DEFAULT_USER_PREFERENCES, key))) {
    return response({ error: 'Choose valid default preferences to initialize.' }, 400);
  }

  await prisma.$transaction(keys.map((key) => prisma.userPreference.upsert({
    where: { ownerId_key: { ownerId: user.id, key } },
    create: { ownerId: user.id, key, value: JSON.stringify(DEFAULT_USER_PREFERENCES[key]) },
    update: {},
  })));

  return response({ initialized: keys });
}