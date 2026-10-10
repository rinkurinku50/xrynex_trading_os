import { NextResponse } from 'next/server';
import { requireAuthenticatedApi } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import { DEFAULT_REMINDER_SETTINGS, DEFAULT_USER_PREFERENCES } from '@/lib/workspace-defaults';
import { normalizeEconomicNewsAlertSettings } from '@/lib/economic-news-alert-settings';

export const dynamic = 'force-dynamic';

const allowedKeys = new Set([
  'routine-tasks',
  'routine-done',
  'routine-auto-done',
  'routine-categories',
  'routine-accent',
  'routine-theme',
  'reminder-settings',
  'economic-news-alert-settings',
  'reminder-acknowledged',
  'trading-plan-checklist',
  'trading-plan-layout',
  'economic-news-order',
]);
const routinePreferenceKeys = [
  'routine-tasks',
  'routine-done',
  'routine-auto-done',
  'routine-categories',
  'routine-accent',
  'routine-theme',
];
const routineKeySet = new Set(routinePreferenceKeys);
const routineColumns = {
  'routine-tasks': 'tasks',
  'routine-done': 'done',
  'routine-auto-done': 'autoDone',
  'routine-categories': 'categories',
  'routine-accent': 'accent',
  'routine-theme': 'theme',
};
const routineDefaults = Object.fromEntries(routinePreferenceKeys.map((key) => [key, DEFAULT_USER_PREFERENCES[key]]));
const noStore = { 'Cache-Control': 'no-store, max-age=0' };

function response(data, status = 200) {
  return NextResponse.json(data, { status, headers: noStore });
}

function serializeRoutineData(values) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [routineColumns[key], JSON.stringify(value)]));
}

function parseRoutineData(row) {
  const values = {};
  for (const key of routinePreferenceKeys) {
    try {
      values[key] = JSON.parse(row[routineColumns[key]]);
    } catch {
      throw new Error(`Saved preference ${key} is invalid.`);
    }
  }
  return values;
}

async function readRoutineData(ownerId) {
  const existing = await prisma.dailyRoutine.findUnique({ where: { ownerId } });
  if (existing) return { values: parseRoutineData(existing), availableKeys: routinePreferenceKeys };

  const legacyRows = await prisma.userPreference.findMany({
    where: { ownerId, key: { in: routinePreferenceKeys } },
  });
  if (!legacyRows.length) return { values: null, availableKeys: [] };

  const values = { ...routineDefaults };
  for (const row of legacyRows) {
    try {
      values[row.key] = JSON.parse(row.value);
    } catch {
      throw new Error(`Saved preference ${row.key} is invalid.`);
    }
  }

  let migrated;
  try {
    migrated = await prisma.dailyRoutine.create({ data: { ownerId, ...serializeRoutineData(values) } });
  } catch (error) {
    if (error.code !== 'P2002') throw error;
    migrated = await prisma.dailyRoutine.findUnique({ where: { ownerId } });
  }
  if (!migrated) throw new Error('Could not migrate saved daily routines.');
  return { values: parseRoutineData(migrated), availableKeys: legacyRows.map((row) => row.key) };
}

export async function GET(request) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;

  const requested = new URL(request.url).searchParams.get('keys');
  const keys = requested ? requested.split(',') : [...allowedKeys];
  if (!keys.length || keys.some((key) => !allowedKeys.has(key))) {
    return response({ error: 'Choose valid preference keys.' }, 400);
  }

  const requestedRoutineKeys = keys.filter((key) => routineKeySet.has(key));
  const preferenceKeys = keys.filter((key) => !routineKeySet.has(key));
  const rows = preferenceKeys.length
    ? await prisma.userPreference.findMany({ where: { ownerId: user.id, key: { in: preferenceKeys } } })
    : [];
  const values = {};
  for (const row of rows) {
    try {
      values[row.key] = JSON.parse(row.value);
    } catch {
      return response({ error: `Saved preference ${row.key} is invalid.` }, 500);
    }
  }
  if (requestedRoutineKeys.length) {
    const routineData = await readRoutineData(user.id);
    for (const key of requestedRoutineKeys) {
      if (routineData.availableKeys.includes(key)) values[key] = routineData.values[key];
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
  const routineValues = {};
  for (const [key, value] of entries) {
    if (key === 'reminder-settings' && (!value || typeof value !== 'object' || Array.isArray(value))) {
      return response({ error: 'Reminder settings must be an object.' }, 400);
    }
    if (key === 'economic-news-alert-settings' && (!value || typeof value !== 'object' || Array.isArray(value))) {
      return response({ error: 'Economic news alert settings must be an object.' }, 400);
    }
    const normalizedValue = key === 'reminder-settings'
      ? { ...DEFAULT_REMINDER_SETTINGS, ...value }
      : key === 'economic-news-alert-settings'
        ? normalizeEconomicNewsAlertSettings(value)
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
    if (routineKeySet.has(key)) routineValues[key] = normalizedValue;
    else records.push({ key, value: serialized });
  }

  const currentRoutine = Object.keys(routineValues).length ? await readRoutineData(user.id) : null;
  const operations = records.map(({ key, value }) => prisma.userPreference.upsert({
    where: { ownerId_key: { ownerId: user.id, key } },
    create: { ownerId: user.id, key, value },
    update: { value },
  }));
  if (currentRoutine) {
    const createValues = { ...(currentRoutine.values || routineDefaults), ...routineValues };
    operations.push(prisma.dailyRoutine.upsert({
      where: { ownerId: user.id },
      create: { ownerId: user.id, ...serializeRoutineData(createValues) },
      update: serializeRoutineData(routineValues),
    }));
  }
  if (operations.length) await prisma.$transaction(operations);

  return response({ saved: entries.map(([key]) => key) });
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

  const routineKeys = keys.filter((key) => routineKeySet.has(key));
  const preferenceKeys = keys.filter((key) => !routineKeySet.has(key));
  const operations = preferenceKeys.map((key) => prisma.userPreference.upsert({
    where: { ownerId_key: { ownerId: user.id, key } },
    create: { ownerId: user.id, key, value: JSON.stringify(DEFAULT_USER_PREFERENCES[key]) },
    update: {},
  }));
  if (routineKeys.length) {
    const current = await readRoutineData(user.id);
    if (!current.values) {
      operations.push(prisma.dailyRoutine.upsert({
        where: { ownerId: user.id },
        create: { ownerId: user.id, ...serializeRoutineData(routineDefaults) },
        update: {},
      }));
    }
  }
  if (operations.length) await prisma.$transaction(operations);

  return response({ initialized: keys });
}