import { prisma } from './db';
import { getSession } from './auth';

async function currentOwnerId() {
  return (await getSession())?.user.id ?? null;
}

const toNumber = (value) => Number(value ?? 0);
const normalizeFocus = (row) => {
  if (!row) return null;
  return {
    ...row,
    days_done: row.daysDone ?? row.days_done ?? null,
    days_total: row.daysTotal ?? row.days_total ?? null,
    updated_at: row.updatedAt ?? row.updated_at ?? null,
  };
};

const normalizeIdea = (row) => {
  if (!row) return null;
  return {
    ...row,
    idea_date: row.ideaDate ?? row.idea_date ?? null,
    created_at: row.createdAt ?? row.created_at ?? null,
  };
};

const normalizeVideo = (row) => {
  if (!row) return null;
  return {
    ...row,
    drive_url: row.driveUrl ?? row.drive_url ?? null,
    watched_on: row.watchedOn ?? row.watched_on ?? null,
    created_at: row.createdAt ?? row.created_at ?? null,
  };
};

const normalizeChart = (row) => {
  if (!row) return null;
  return {
    ...row,
    drive_url: row.driveUrl ?? row.drive_url ?? null,
    chart_date: row.chartDate ?? row.chart_date ?? null,
    created_at: row.createdAt ?? row.created_at ?? null,
  };
};

const normalizeTask = (row) => {
  if (!row) return null;
  return {
    ...row,
    task_date: row.taskDate ?? row.task_date ?? null,
    reminder_time: row.reminderTime ?? row.reminder_time ?? null,
    completed_at: row.completedAt ?? row.completed_at ?? null,
    removed_at: row.removedAt ?? row.removed_at ?? null,
  };
};

/* ---------- focus ---------- */
export const getFocus = async () => {
  const ownerId = await currentOwnerId();
  if (!ownerId) return null;
  const row = await prisma.focus.findUnique({ where: { ownerId } });
  return normalizeFocus(row);
};

/* ---------- everything else ---------- */
export const getStrategies = async () => {
  const ownerId = await currentOwnerId();
  return ownerId ? prisma.strategy.findMany({ where: { ownerId }, orderBy: { code: 'asc' } }) : [];
};

export const getIdeas = async (tag) => {
  const ownerId = await currentOwnerId();
  if (!ownerId) return [];
  const rows = await prisma.idea.findMany({
    where: { ownerId, ...(tag ? { tag } : {}) },
    orderBy: [{ ideaDate: 'desc' }, { id: 'desc' }],
  });
  return rows.map(normalizeIdea);
};

export const getVideos = async () => {
  const ownerId = await currentOwnerId();
  if (!ownerId) return [];
  const rows = await prisma.video.findMany({ where: { ownerId }, orderBy: [{ watchedOn: 'desc' }, { id: 'desc' }] });
  return rows.map(normalizeVideo);
};

export const getCharts = async (limit = 100) => {
  const ownerId = await currentOwnerId();
  if (!ownerId) return [];
  const rows = await prisma.chart.findMany({ where: { ownerId }, orderBy: [{ chartDate: 'desc' }, { id: 'desc' }], take: limit });
  return rows.map(normalizeChart);
};

export const getConcepts = async () => {
  const ownerId = await currentOwnerId();
  return ownerId ? prisma.concept.findMany({ where: { ownerId }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }) : [];
};

export const getTasks = async () => {
  const ownerId = await currentOwnerId();
  if (!ownerId) return [];
  const today = new Date();
  const start = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  const rows = await prisma.task.findMany({
    where: { ownerId, taskDate: { gte: start, lt: end }, removedAt: null },
    orderBy: [{ priority: 'asc' }, { id: 'asc' }],
  });
  return rows.map(normalizeTask);
};

export const getEconomicNews = async () => {
  const ownerId = await currentOwnerId();
  if (!ownerId) return [];
  return prisma.economicNews.findMany({
    where: { ownerId },
    orderBy: [
      { eventAt: { sort: 'desc', nulls: 'last' } },
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
    take: 50,
  });
};

export const getAllTasks = async () => {
  const ownerId = await currentOwnerId();
  if (!ownerId) return [];
  const rows = await prisma.task.findMany({
    where: { ownerId },
    orderBy: [{ taskDate: 'desc' }, { id: 'desc' }],
  });
  return rows.map(normalizeTask);
};

export const getDriveFolders = async () => {
  const ownerId = await currentOwnerId();
  return ownerId ? prisma.driveFolder.findMany({ where: { ownerId }, orderBy: { id: 'asc' } }) : [];
};
