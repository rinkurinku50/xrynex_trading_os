import { PrismaClient } from '@prisma/client';

const sourceUrl = process.env.SOURCE_DATABASE_URL;
const targetUrl = process.env.DATABASE_URL;
const email = (process.env.MIGRATION_USER_EMAIL || process.env.ADMIN_EMAILS || '')
  .split(',')[0]
  .trim()
  .toLowerCase();

if (!sourceUrl || !targetUrl || !email) {
  throw new Error('Set SOURCE_DATABASE_URL, DATABASE_URL, and MIGRATION_USER_EMAIL (or ADMIN_EMAILS).');
}
if (new URL(sourceUrl).host === new URL(targetUrl).host) {
  throw new Error('Source and target database hosts must be different.');
}

const source = new PrismaClient({ datasourceUrl: sourceUrl });
const target = new PrismaClient({ datasourceUrl: targetUrl });

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
];
const targetModels = [
  'user', 'strategy', 'idea', 'video', 'chart', 'concept', 'task', 'focus',
  'driveFolder', 'economicCalendarScreenshot', 'economicNews', 'legacyDataClaim',
  'appSetting', 'authSession', 'ssoLoginCode', 'ssoAssertionUse', 'authRateLimit',
];

try {
  const sourceUser = await source.user.findUnique({ where: { email } });
  if (!sourceUser) throw new Error('The requested source account was not found.');
  if (!sourceUser.passwordHash || !sourceUser.emailVerifiedAt) {
    throw new Error('Source account needs a password and verified email before password-only production login.');
  }

  const counts = {};
  const records = {};
  for (const [model, key] of ownerModels) {
    if (model === 'focus' || model === 'economicCalendarScreenshot') {
      const row = await source[model].findUnique({ where: { ownerId: sourceUser.id } });
      records[key] = row ? [row] : [];
    } else {
      records[key] = await source[model].findMany({ where: { ownerId: sourceUser.id } });
    }
    counts[key] = records[key].length;
  }
  const legacyClaim = await source.legacyDataClaim.findUnique({ where: { id: 1 } });
  const appSettings = await source.appSetting.findMany();

  for (const model of targetModels) {
    if (await target[model].count()) {
      throw new Error(`Target table ${model} is not empty; migration stopped without writing data.`);
    }
  }

  await target.$transaction(async (tx) => {
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

    for (const [model, key] of ownerModels) {
      const rows = records[key].map(({ id, ...row }) => row);
      if (rows.length) await tx[model].createMany({ data: rows });
    }

    if (legacyClaim) {
      await tx.legacyDataClaim.create({ data: { userId: sourceUser.id, createdAt: legacyClaim.createdAt } });
    }
    if (appSettings.length) {
      await tx.appSetting.createMany({ data: appSettings.map((setting) => ({
        id: setting.id,
        publicSignupEnabled: false,
        updatedAt: setting.updatedAt,
      })) });
    }
  }, { maxWait: 10_000, timeout: 60_000 });

  console.log(JSON.stringify({
    migrated: true,
    accountIncluded: true,
    passwordHashIncluded: true,
    legacySsoLinkIncluded: false,
    activeSessionsIncluded: false,
    oneTimeSsoCodesIncluded: false,
    rateLimitsIncluded: false,
    publicSignupEnabled: false,
    workspaceRecords: counts,
  }));
} catch (error) {
  console.error(JSON.stringify({ migrated: false, code: error.code || null, type: error.constructor.name, message: error.message }));
  process.exitCode = 1;
} finally {
  await source.$disconnect();
  await target.$disconnect();
}
