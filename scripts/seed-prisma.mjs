import { PrismaClient as PostgresPrismaClient } from '@prisma/client';
import { PrismaClient as SQLitePrismaClient } from '../generated/sqlite-client/index.js';
import { DEFAULT_USER_PREFERENCES } from '../lib/workspace-defaults.js';

const useSQLite = process.env.NODE_ENV !== 'production' && process.env.SQLITE_DATABASE_URL?.startsWith('file:');
const PrismaClient = useSQLite ? SQLitePrismaClient : PostgresPrismaClient;
const prisma = new PrismaClient();
const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date();
const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
const daysAgo = (days) => new Date(today.getTime() - days * DAY_MS);
const daysAhead = (days) => new Date(today.getTime() + days * DAY_MS);

function configuredSeedEmail() {
  const email = (process.env.SEED_USER_EMAIL || process.env.ADMIN_EMAILS || '').split(',')[0].trim().toLowerCase();
  if (!email) throw new Error('Set SEED_USER_EMAIL or ADMIN_EMAILS to the existing account that should own demo data.');
  return email;
}

async function createMissingForOwner(model, ownerId, rows, uniqueField) {
  let created = 0;
  for (const data of rows) {
    const comparableField = typeof data.title === 'string'
      ? 'title'
      : typeof data.name === 'string'
        ? 'name'
        : typeof data.text === 'string'
          ? 'text'
          : uniqueField;
    const normalizeDemoLabel = (value) => String(value).replace(/^demo\s*[—–:-]\s*/i, '').trim().toLowerCase();
    const existing = await model.findMany({
      where: { ownerId },
      select: { [uniqueField]: true, [comparableField]: true },
    });
    const alreadyPresent = existing.some((row) => {
      if (typeof data[comparableField] === 'string' && typeof row[comparableField] === 'string') {
        return normalizeDemoLabel(row[comparableField]) === normalizeDemoLabel(data[comparableField]);
      }
      return row[uniqueField] === data[uniqueField];
    });
    if (!alreadyPresent) {
      await model.create({ data: { ...data, ownerId } });
      created += 1;
    }
  }
  return created;
}

async function initializeMissingPreferences(ownerId) {
  const existing = await prisma.userPreference.findMany({
    where: { ownerId },
    select: { key: true },
  });
  const existingKeys = new Set(existing.map(({ key }) => key));
  const missing = Object.entries(DEFAULT_USER_PREFERENCES).filter(([key]) => !existingKeys.has(key));
  if (!missing.length) return 0;

  await prisma.$transaction(missing.map(([key, value]) => prisma.userPreference.upsert({
    where: { ownerId_key: { ownerId, key } },
    create: { ownerId, key, value: JSON.stringify(value) },
    update: {},
  })));
  return missing.length;
}

async function main() {
  const email = configuredSeedEmail();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!user) throw new Error(`No account found for ${email}. Create/sign in to the account before seeding demo data.`);

  let added = 0;
  added += await initializeMissingPreferences(user.id);

  const focus = await prisma.focus.findUnique({ where: { ownerId: user.id } });
  if (!focus) {
    await prisma.focus.create({
      data: {
        ownerId: user.id,
        instrument: 'NQ (MNQ)',
        session: 'New York (9:30 AM–11:30 AM)',
        timeframe: '15m HTF / 1m–5m execution',
        strategy: 'NY Liquidity Sweep + FVG',
        bias: 'Bullish',
        daysDone: 3,
        daysTotal: 5,
      },
    });
    added += 1;
  }

  added += await createMissingForOwner(prisma.strategy, user.id, [
    { code: 'DEMO-01', name: 'NY Liquidity Sweep', status: 'Active', description: 'Demo: sweep of Asia or London liquidity into the New York open, followed by displacement.', rules: 'Wait for a clear liquidity raid. Require displacement and a retracement into an FVG. Define invalidation before entry.', showInNav: true },
    { code: 'DEMO-02', name: 'PDH / PDL Sweep', status: 'Backtesting', description: 'Demo: previous-day high or low raid followed by a reversal structure.', rules: 'Record the level, sweep time, confirmation, stop, and outcome.', showInNav: true },
    { code: 'DEMO-03', name: 'FVG Retracement', status: 'Testing', description: 'Demo: retracement into a lower-timeframe fair value gap after higher-timeframe displacement.', rules: 'Only take aligned setups. Note entry, stop, target, and whether the gap held.' },
  ], 'code');

  added += await createMissingForOwner(prisma.idea, user.id, [
    { title: 'DEMO — Compare opening-range retests with liquidity sweeps', tag: 'Idea', note: 'Sample hypothesis: compare entry quality across a fixed, simulated set of examples.', status: 'Testing', ideaDate: daysAgo(1) },
    { title: 'DEMO — Measure setup quality by weekday', tag: 'Idea', note: 'Sample next step: categorize a consistent set by weekday before drawing conclusions.', status: 'Open', ideaDate: daysAgo(2) },
    { title: 'DEMO — Test a fixed risk cap on simulated examples', tag: 'Research', note: 'Sample next step: compare planned risk and invalidation on historical examples.', status: 'Open', ideaDate: daysAgo(4) },
    { title: 'DEMO — Question: does news timing change entry quality?', tag: 'Question', note: 'Sample question: compare a defined set of news and non-news sessions.', status: 'Open', ideaDate: daysAgo(5) },
    { title: 'DEMO — Dropped example: no defined invalidation', tag: 'Idea', note: 'Example retained in Archive to demonstrate the Dropped state.', status: 'Dropped', ideaDate: daysAgo(8) },
  ], 'title');

  added += await createMissingForOwner(prisma.video, user.id, [
    { title: 'DEMO — Pre-market preparation checklist', creator: 'Demo entry', topic: 'Preparation', watchedOn: daysAgo(1), driveUrl: null, notes: 'Sample notes: map levels, check the calendar, write a bias and invalidation, and avoid treating the example as trading advice.' },
    { title: 'DEMO — Annotating a hypothetical entry', creator: 'Demo entry', topic: 'Execution', watchedOn: daysAgo(3), driveUrl: null, notes: 'Sample notes: capture the setup context, confirmation, planned risk, and what would invalidate the idea.' },
    { title: 'DEMO — Post-session review framework', creator: 'Demo entry', topic: 'Review', watchedOn: daysAgo(6), driveUrl: null, notes: 'Sample notes: compare actions with the written plan and record one process improvement.' },
  ], 'title');

  added += await createMissingForOwner(prisma.chart, user.id, [
    { title: 'DEMO — NQ session structure', driveUrl: '/demo-chart.svg', instrument: 'NQ', note: 'Illustrative chart only — not market data or trading advice.', chartDate: daysAgo(1) },
    { title: 'DEMO — Liquidity sweep example', driveUrl: '/demo-chart.svg', instrument: 'MNQ', note: 'Illustrative chart only — replace with your own chart and annotations.', chartDate: daysAgo(2) },
    { title: 'DEMO — FVG retracement example', driveUrl: '/demo-chart.svg', instrument: 'ES', note: 'Illustrative pattern only — not market data or trading advice.', chartDate: daysAgo(4) },
  ], 'title');

  added += await createMissingForOwner(prisma.concept, user.id, [
    { name: 'DEMO — Session Timing', subtitle: 'Example preparation notes', body: 'Sample entry: record the session window, scheduled events to check, and the conditions that would make you stand aside.', sortOrder: 901, showInNav: false, icon: 'chart' },
    { name: 'DEMO — Risk Checklist', subtitle: 'Example risk notes', body: 'Sample checklist: define invalidation, planned risk, position sizing rules, and reasons to skip before considering an entry.', sortOrder: 902, showInNav: false, icon: 'layers' },
    { name: 'DEMO — Entry Confirmation Checklist', subtitle: 'Example execution notes', body: 'Sample checklist: write down the required confirmation, timeframe context, entry condition, and invalidation before reviewing a setup.', sortOrder: 903, showInNav: false, icon: 'water' },
  ], 'name');

  const taskExamples = [
    { title: 'DEMO — Check scheduled event times in a trusted calendar', done: true, priority: 'High', taskDate: today, completedAt: new Date(today.getTime() + 8 * 60 * 60 * 1000) },
    { title: 'DEMO — Record a pre-session bias and invalidation', done: false, priority: 'Medium', taskDate: today, completedAt: null },
    { title: 'DEMO — Note one setup to skip and why', done: false, priority: 'Low', taskDate: today, completedAt: null },
    { title: 'DEMO — Review entry screenshots for process errors', done: false, priority: 'Medium', taskDate: daysAhead(1), completedAt: null },
    { title: 'DEMO — Complete a weekly process review', done: true, priority: 'Low', taskDate: daysAgo(1), completedAt: new Date(daysAgo(1).getTime() + 15 * 60 * 60 * 1000) },
    { title: 'DEMO — Deferred placeholder from a prior session', done: false, priority: 'Low', taskDate: daysAgo(2), completedAt: null, removedAt: new Date(daysAgo(2).getTime() + 16 * 60 * 60 * 1000) },
  ];
  added += await createMissingForOwner(prisma.task, user.id, taskExamples, 'title');

  added += await createMissingForOwner(prisma.driveFolder, user.id, [
    { name: 'DEMO — Replace with your weekly review folder', driveUrl: 'https://drive.google.com/drive/my-drive' },
    { name: 'DEMO — Replace with your execution screenshots folder', driveUrl: 'https://drive.google.com/drive/my-drive' },
  ], 'name');

  const tomorrow = daysAhead(1).toISOString().slice(0, 10);
  added += await createMissingForOwner(prisma.economicNews, user.id, [
    { title: 'DEMO — Review scheduled event times in a trusted calendar', priority: 'High', eventAt: `${tomorrow}T08:30` },
    { title: 'DEMO — Note session context before reviewing a market event', priority: 'Medium', eventAt: `${tomorrow}T10:00` },
  ], 'id');

  added += await createMissingForOwner(prisma.tradingMistake, user.id, [
    { title: 'DEMO — Entered before confirmation', description: 'Illustrative process review entry; replace with your own observation.', category: 'Entry', severity: 'Medium', preventionRule: 'Wait for the written confirmation criteria before considering entry.', frequency: 0 },
    { title: 'DEMO — Risk was not defined first', description: 'Illustrative process review entry; replace with your own observation.', category: 'Risk Management', severity: 'High', preventionRule: 'Define invalidation and planned risk before considering entry.', frequency: 0 },
  ], 'id');

  added += await createMissingForOwner(prisma.mistakeReviewPoint, user.id, [
    { text: 'DEMO — Did each decision follow the written plan?' },
    { text: 'DEMO — What process change is worth testing next?' },
  ], 'id');

  const calendar = await prisma.economicCalendarScreenshot.findUnique({ where: { ownerId: user.id } });
  if (!calendar || !calendar.imageUrl) {
    await prisma.economicCalendarScreenshot.upsert({
      where: { ownerId: user.id },
      create: { ownerId: user.id, imageUrl: '/demo-calendar.svg' },
      update: { imageUrl: '/demo-calendar.svg' },
    });
    if (!calendar) added += 1;
  }

  console.log(`Demo data ready for ${user.email}. Added ${added} records. Existing records were preserved.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
