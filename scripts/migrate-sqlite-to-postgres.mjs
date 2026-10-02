import { existsSync, statSync } from 'node:fs';
import { PrismaClient as PostgresPrismaClient } from '@prisma/client';
import { PrismaClient as SQLitePrismaClient } from '../generated/sqlite-client/index.js';

for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(file);
  } catch {}
}

process.env.SQLITE_DATABASE_URL ||= 'file:./dev.db';

const productionUrl = process.env.PROD_DATABASE_URL;
const apply = process.argv.includes('--apply');
const replaceAll = process.argv.includes('--replace-all');
const backupArgument = process.argv.find((argument) => argument.startsWith('--backup-file='));
const backupPath = backupArgument?.slice('--backup-file='.length);

const models = [
  'user',
  'appSetting',
  'ssoAssertionUse',
  'authRateLimit',
  'authSession',
  'ssoLoginCode',
  'strategy',
  'idea',
  'video',
  'chart',
  'concept',
  'task',
  'focus',
  'driveFolder',
  'economicCalendarScreenshot',
  'economicNews',
  'tradingMistake',
  'mistakeMemoryState',
  'mistakeReviewPoint',
  'mindsetCategory',
  'legacyDataClaim',
  'tradingMistakeOccurrence',
  'mindsetTip',
  'userPreference',
];

const tableNames = {
  user: 'users',
  appSetting: 'app_settings',
  ssoAssertionUse: 'sso_assertion_uses',
  authRateLimit: 'auth_rate_limits',
  authSession: 'auth_sessions',
  ssoLoginCode: 'sso_login_codes',
  strategy: 'strategies',
  idea: 'ideas',
  video: 'videos',
  chart: 'charts',
  concept: 'concepts',
  task: 'tasks',
  focus: 'focus',
  driveFolder: 'drive_folders',
  economicCalendarScreenshot: 'economic_calendar_screenshot',
  economicNews: 'economic_news',
  tradingMistake: 'trading_mistakes',
  mistakeMemoryState: 'mistake_memory_state',
  mistakeReviewPoint: 'mistake_review_points',
  mindsetCategory: 'mindset_categories',
  legacyDataClaim: 'legacy_data_claim',
  tradingMistakeOccurrence: 'trading_mistake_occurrences',
  mindsetTip: 'mindset_tips',
  userPreference: 'user_preferences',
};

const deleteOrder = [
  'tradingMistakeOccurrence',
  'mindsetTip',
  'tradingMistake',
  'mindsetCategory',
  'mistakeMemoryState',
  'mistakeReviewPoint',
  'userPreference',
  'authSession',
  'ssoLoginCode',
  'ssoAssertionUse',
  'authRateLimit',
  'legacyDataClaim',
  'economicNews',
  'economicCalendarScreenshot',
  'focus',
  'driveFolder',
  'task',
  'chart',
  'video',
  'idea',
  'strategy',
  'concept',
  'appSetting',
  'user',
];

const autoIncrementTables = [
  'strategies',
  'ideas',
  'videos',
  'charts',
  'concepts',
  'tasks',
  'drive_folders',
  'economic_calendar_screenshot',
  'economic_news',
];

function requireConfiguration() {
  if (!productionUrl) throw new Error('Set PROD_DATABASE_URL in .env.local.');
  const url = new URL(productionUrl);
  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    throw new Error('PROD_DATABASE_URL must use PostgreSQL.');
  }
  if (url.hostname.includes('-pooler') || !url.hostname.endsWith('.neon.tech')) {
    throw new Error('PROD_DATABASE_URL must be the direct, unpooled Neon endpoint.');
  }
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    throw new Error('Refusing to target a local database.');
  }
  if (apply && (!replaceAll || !backupPath || !existsSync(backupPath) || statSync(backupPath).size < 100)) {
    throw new Error('Apply requires --replace-all and a valid --backup-file.');
  }
  if (replaceAll && !apply) throw new Error('--replace-all requires --apply.');
  return url;
}

async function readCounts(client) {
  const counts = {};
  for (const model of models) counts[model] = await client[model].count();
  return counts;
}

async function main() {
  const productionAddress = requireConfiguration();
  const source = new SQLitePrismaClient({ log: ['error'] });
  const target = new PostgresPrismaClient({ datasourceUrl: productionUrl, log: ['error'] });

  try {
    const sourceCounts = await readCounts(source);
    const targetCounts = await readCounts(target);
    const sourceTotal = Object.values(sourceCounts).reduce((sum, count) => sum + count, 0);
    if (!sourceCounts.user || !sourceTotal) throw new Error('The SQLite source is empty or has no users.');

    const plan = {
      mode: apply ? 'replace-all' : 'dry-run',
      target: { host: productionAddress.hostname, database: productionAddress.pathname.slice(1) },
      backup: backupPath || null,
      sourceCounts,
      existingProductionCounts: targetCounts,
      rowsToImport: sourceTotal,
      productionRowsToDelete: Object.values(targetCounts).reduce((sum, count) => sum + count, 0),
    };

    if (!apply) {
      console.log(JSON.stringify(plan, null, 2));
      return;
    }

    const rowsByModel = new Map();
    for (const model of models) rowsByModel.set(model, await source[model].findMany());

    await target.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`LOCK TABLE ${models.map((model) => {
        return `"public"."${tableNames[model]}"`;
      }).join(', ')} IN ACCESS EXCLUSIVE MODE`);

      for (const model of deleteOrder) await tx[model].deleteMany();
      for (const model of models) {
        const rows = rowsByModel.get(model);
        if (rows.length) await tx[model].createMany({ data: rows });
      }

      for (const table of autoIncrementTables) {
        await tx.$queryRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('"public"."${table}"', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM "public"."${table}"`,
        );
      }

      const importedCounts = await readCounts(tx);
      for (const model of models) {
        if (importedCounts[model] !== sourceCounts[model]) {
          throw new Error(`Count verification failed for ${model}; transaction rolled back.`);
        }
      }
    }, { maxWait: 10_000, timeout: 120_000 });

    console.log(JSON.stringify({ ...plan, committed: true, deletedRows: plan.productionRowsToDelete }, null, 2));
  } finally {
    await Promise.all([source.$disconnect(), target.$disconnect()]);
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    migrated: false,
    type: error.constructor.name,
    code: error.code || null,
    message: error.message.includes('rolled back')
      ? error.message
      : 'Migration stopped; no database rows were changed.',
  }));
  process.exitCode = 1;
});