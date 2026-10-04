import { PrismaClient as PostgresPrismaClient } from '@prisma/client';
import { PrismaClient as SQLitePrismaClient } from '../generated/sqlite-client/index.js';

if (!process.env.DATABASE_URL?.startsWith('postgres')) {
  throw new Error('DATABASE_URL must point to the PostgreSQL source database.');
}
if (!process.env.SQLITE_DATABASE_URL?.startsWith('file:')) {
  throw new Error('SQLITE_DATABASE_URL must point to the local SQLite destination.');
}

const source = new PostgresPrismaClient({ log: ['error'] });
const destination = new SQLitePrismaClient({ log: ['error'] });
const modelNames = [
  'user',
  'appSetting',
  'ssoAssertionUse',
  'authRateLimit',
  'authSession',
  'ssoLoginCode',
  'economicCalendarScreenshot',
  'economicNews',
  'strategy',
  'idea',
  'video',
  'chart',
  'concept',
  'task',
  'focus',
  'driveFolder',
  'tradingMistake',
  'mistakeMemoryState',
  'mistakeReviewPoint',
  'mindsetCategory',
  'legacyDataClaim',
  'tradingMistakeOccurrence',
  'mindsetTip',
  'userPreference',
  'dailyRoutine',
];

try {
  const destinationCounts = await Promise.all(modelNames.map(async (name) => ({
    name,
    count: await destination[name].count(),
  })));
  const occupied = destinationCounts.filter((entry) => entry.count > 0);
  if (occupied.length) {
    throw new Error(`SQLite destination is not empty (${occupied.map((entry) => entry.name).join(', ')}). No rows were copied.`);
  }

  const sourceRows = new Map();
  for (const name of modelNames) {
    try {
      sourceRows.set(name, await source[name].findMany());
    } catch (error) {
      if (name === 'userPreference' && error.code === 'P2021') {
        sourceRows.set(name, []);
      } else {
        throw error;
      }
    }
  }

  await destination.$transaction(async (tx) => {
    for (const name of modelNames) {
      for (const row of sourceRows.get(name)) {
        await tx[name].create({ data: row });
      }
    }
  }, { maxWait: 10_000, timeout: 120_000 });

  const copied = Object.fromEntries(modelNames.map((name) => [name, sourceRows.get(name).length]));
  console.log(JSON.stringify({ copiedTotal: Object.values(copied).reduce((sum, count) => sum + count, 0), copied }));
} finally {
  await Promise.all([source.$disconnect(), destination.$disconnect()]);
}