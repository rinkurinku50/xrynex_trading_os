import { PrismaClient as PostgresPrismaClient } from '@prisma/client';
import { PrismaClient as SQLitePrismaClient } from '@/generated/sqlite-client';

const globalForPrisma = globalThis;
const useLocalSQLite = process.env.NODE_ENV !== 'production' && Boolean(process.env.SQLITE_DATABASE_URL);
const clientKey = useLocalSQLite ? '__sqlitePrisma' : '__postgresPrisma';
const PrismaClient = useLocalSQLite ? SQLitePrismaClient : PostgresPrismaClient;

export const prisma =
  globalForPrisma[clientKey] ??
  new PrismaClient({
    log: ['error']
  });

if (!globalForPrisma[clientKey]) globalForPrisma[clientKey] = prisma;

/** Run a parameterised query and return the rows. */
export async function q(text, params = []) {
  return prisma.$queryRawUnsafe(text, ...params);
}

/** Run a query and return the first row (or null). */
export async function one(text, params = []) {
  const rows = await q(text, params);
  return Array.isArray(rows) ? rows[0] ?? null : null;
}
