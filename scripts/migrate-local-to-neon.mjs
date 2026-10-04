import { PrismaClient } from '@prisma/client';

const sourceUrl = process.env.SOURCE_DATABASE_URL;
const targetUrl = process.env.DATABASE_URL;
const email = (process.env.MIGRATION_USER_EMAIL || process.env.ADMIN_EMAILS || '')
  .split(',')[0]
  .trim()
  .toLowerCase();
const apply = process.argv.includes('--apply');

const ownerModels = [
  ['strategy', 'strategies'],
  ['idea', 'ideas'],
  ['video', 'videos'],
  ['chart', 'charts'],
  ['concept', 'concepts'],
  ['task', 'tasks'],
  ['focus', 'focus'],
  ['driveFolder', 'driveFolders'],
  ['economicCalendarScreenshot', 'calendarScreenshots'],
  ['economicNews', 'economicNews'],
  ['dailyRoutine', 'dailyRoutines'],
];
const singletonModels = new Set(['focus', 'economicCalendarScreenshot', 'dailyRoutine']);

class MigrationPlanError extends Error {}

function canonicalize(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function fingerprint(record) {
  const { id, ...data } = record;
  return JSON.stringify(canonicalize(data));
}

function transferRecord(record, destinationUserId) {
  const { id, ...data } = record;
  return { ...data, ownerId: destinationUserId };
}

async function main() {
  if (!sourceUrl || !targetUrl || !email) {
    throw new MigrationPlanError('Set SOURCE_DATABASE_URL, DATABASE_URL, and MIGRATION_USER_EMAIL.');
  }

  const sourceAddress = new URL(sourceUrl);
  const targetAddress = new URL(targetUrl);
  if (sourceAddress.host === targetAddress.host && sourceAddress.pathname === targetAddress.pathname) {
    throw new MigrationPlanError('Source and target databases must be different.');
  }

  const source = new PrismaClient({ datasourceUrl: sourceUrl });
  const target = new PrismaClient({ datasourceUrl: targetUrl });

  try {
    const sourceUser = await source.user.findUnique({ where: { email } });
    if (!sourceUser) throw new MigrationPlanError('The requested source account was not found.');

    const sourceRows = new Map();
    for (const [model, key] of ownerModels) {
      sourceRows.set(key, singletonModels.has(model)
        ? [await source[model].findUnique({ where: { ownerId: sourceUser.id } })].filter(Boolean)
        : await source[model].findMany({ where: { ownerId: sourceUser.id } }));
    }
    const sourceClaim = await source.legacyDataClaim.findUnique({ where: { id: 1 } });

    const plan = await target.$transaction(async (tx) => {
      const targetUserByEmail = await tx.user.findUnique({ where: { email } });
      const targetUserById = await tx.user.findUnique({ where: { id: sourceUser.id } });

      if (targetUserByEmail && targetUserById && targetUserByEmail.id !== targetUserById.id) {
        throw new MigrationPlanError('Source email and user ID resolve to different production accounts.');
      }
      if (targetUserById && targetUserById.email.toLowerCase() !== email) {
        throw new MigrationPlanError('The source user ID belongs to another production account.');
      }

      const existingUser = targetUserByEmail || targetUserById;
      if (!existingUser && (!sourceUser.passwordHash || !sourceUser.emailVerifiedAt)) {
        throw new MigrationPlanError('A new production account requires a source password and verified email.');
      }

      const destinationUserId = existingUser?.id || sourceUser.id;
      const inserts = {};
      const duplicates = {};
      const sourceCounts = {};
      const conflicts = [];

      for (const [model, key] of ownerModels) {
        const incoming = sourceRows.get(key);
        const current = singletonModels.has(model)
          ? [await tx[model].findUnique({ where: { ownerId: destinationUserId } })].filter(Boolean)
          : await tx[model].findMany({ where: { ownerId: destinationUserId } });
        const currentFingerprints = new Set(current.map(fingerprint));
        const plannedFingerprints = new Set();
        const pending = [];
        let duplicateCount = 0;

        for (const row of incoming) {
          const data = transferRecord(row, destinationUserId);
          const rowFingerprint = fingerprint(data);
          if (currentFingerprints.has(rowFingerprint) || plannedFingerprints.has(rowFingerprint)) {
            duplicateCount += 1;
            continue;
          }
          if (singletonModels.has(model) && current.length) {
            conflicts.push(key);
            continue;
          }
          pending.push(data);
          plannedFingerprints.add(rowFingerprint);
        }

        sourceCounts[key] = incoming.length;
        duplicates[key] = duplicateCount;
        inserts[key] = pending;
      }

      let claimInsert = null;
      if (sourceClaim) {
        const targetClaim = await tx.legacyDataClaim.findUnique({ where: { id: 1 } });
        if (!targetClaim) claimInsert = { userId: destinationUserId, createdAt: sourceClaim.createdAt };
        else if (targetClaim.userId !== destinationUserId) conflicts.push('legacyDataClaim');
      }

      const report = {
        mode: apply ? 'apply' : 'dry-run',
        account: existingUser ? 'matched-existing' : 'will-create',
        workspaceRecords: Object.fromEntries(ownerModels.map(([, key]) => [key, {
          source: sourceCounts[key],
          duplicate: duplicates[key],
          insert: inserts[key].length,
        }])),
        legacyClaim: claimInsert ? 'will-insert' : sourceClaim ? 'already-present-or-conflict' : 'absent-at-source',
        conflicts: [...new Set(conflicts)],
        existingProductionRowsChanged: 0,
        deletedRows: 0,
        sessionsMigrated: false,
        ssoCodesMigrated: false,
        productionSignupSettingChanged: false,
      };

      if (!apply || conflicts.length) return report;

      if (!existingUser) {
        await tx.user.create({
          data: {
            id: sourceUser.id,
            email: sourceUser.email,
            name: sourceUser.name,
            passwordHash: sourceUser.passwordHash,
            isAdmin: sourceUser.isAdmin,
            emailVerifiedAt: sourceUser.emailVerifiedAt,
            createdAt: sourceUser.createdAt,
            updatedAt: sourceUser.updatedAt,
            legacySubject: null,
          },
        });
      }

      for (const [model, key] of ownerModels) {
        const rows = inserts[key];
        if (!rows.length) continue;
        if (singletonModels.has(model)) await tx[model].create({ data: rows[0] });
        else await tx[model].createMany({ data: rows });
      }
      if (claimInsert) await tx.legacyDataClaim.create({ data: claimInsert });
      return report;
    }, { maxWait: 10_000, timeout: 60_000 });

    console.log(JSON.stringify(plan, null, 2));
    if (apply && plan.conflicts.length) process.exitCode = 2;
  } finally {
    await source.$disconnect();
    await target.$disconnect();
  }
}

main().catch((error) => {
  const knownError = error instanceof MigrationPlanError;
  console.error(JSON.stringify({
    migrated: false,
    type: error.constructor.name,
    code: error.code || null,
    message: knownError ? error.message : 'Migration preflight failed; no data was written.',
  }));
  process.exitCode = 1;
});
