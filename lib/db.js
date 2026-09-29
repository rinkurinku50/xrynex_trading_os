import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: ['error']
  });

if (!globalForPrisma.__prisma) globalForPrisma.__prisma = prisma;

/** Run a parameterised query and return the rows. */
export async function q(text, params = []) {
  return prisma.$queryRawUnsafe(text, ...params);
}

/** Run a query and return the first row (or null). */
export async function one(text, params = []) {
  const rows = await q(text, params);
  return Array.isArray(rows) ? rows[0] ?? null : null;
}
