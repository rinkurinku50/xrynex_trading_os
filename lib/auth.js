import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { prisma } from '@/lib/db';

export const SESSION_COOKIE = 'tradingos_session';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function passwordHashInput(password) {
  // bcrypt truncates inputs above 72 bytes; pre-hashing preserves the supported password length.
  return sha256(`TradingOS password v1:${password}`);
}

export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function validEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function sessionCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  };
}

export async function claimLegacyWorkspace(tx, userId) {
  const current = await tx.legacyDataClaim.findUnique({ where: { id: 1 } });
  if (current) return;

  // Serialize only the one-time migration of pre-auth single-user records.
  await tx.$queryRaw`SELECT 1::int AS locked FROM (SELECT pg_advisory_xact_lock(7402196301)) AS lock_guard`;
  const claim = await tx.legacyDataClaim.findUnique({ where: { id: 1 } });
  if (claim) return;

  for (const model of [
    'strategy', 'idea', 'video', 'chart', 'concept', 'task', 'focus', 'driveFolder', 'economicCalendarScreenshot',
  ]) {
    await tx[model].updateMany({ where: { ownerId: null }, data: { ownerId: userId } });
  }
  await tx.legacyDataClaim.create({ data: { id: 1, userId } });
}

export function clearSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  };
}

export async function createSession(userId) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.authSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await prisma.authSession.create({
    data: { tokenHash: sha256(token), userId, expiresAt },
  });
  return { token, expiresAt };
}

export const getSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 128) return null;
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  return { id: session.id, expiresAt: session.expiresAt, user: session.user };
});

export async function requireApiUser() {
  const session = await getSession();
  return session?.user ?? null;
}

export function originIsAllowed(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    if (process.env.NODE_ENV !== 'production') {
      return new URL(origin).origin === new URL(request.url).origin;
    }

    const allowedOrigins = new Set();
    if (process.env.APP_URL) allowedOrigins.add(new URL(process.env.APP_URL).origin);

    // Vercel provides the canonical project production domain independently of
    // the deployment-specific VERCEL_URL. Use it so aliases keep working when
    // APP_URL was set to an older or preview hostname.
    const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (vercelProductionUrl) {
      allowedOrigins.add(new URL(
        vercelProductionUrl.startsWith('http') ? vercelProductionUrl : `https://${vercelProductionUrl}`
      ).origin);
    }

    return allowedOrigins.has(new URL(origin).origin);
  } catch {
    return false;
  }
}

export function requestAddress(request) {
  // Configure the hosting proxy to overwrite these headers rather than pass them through.
  return request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';
}

export async function consumeRateLimit(action, identity, maxAttempts = 10) {
  const key = sha256(`${action}:${identity}`);
  const rows = await prisma.$queryRaw`
    INSERT INTO auth_rate_limits (key, attempts, window_started_at, blocked_until)
    VALUES (${key}, 1, NOW(), NULL)
    ON CONFLICT (key) DO UPDATE SET
      attempts = CASE
        WHEN auth_rate_limits.window_started_at < NOW() - INTERVAL '15 minutes' THEN 1
        ELSE auth_rate_limits.attempts + 1
      END,
      window_started_at = CASE
        WHEN auth_rate_limits.window_started_at < NOW() - INTERVAL '15 minutes' THEN NOW()
        ELSE auth_rate_limits.window_started_at
      END,
      blocked_until = CASE
        WHEN auth_rate_limits.window_started_at < NOW() - INTERVAL '15 minutes' THEN NULL
        WHEN auth_rate_limits.attempts + 1 >= ${maxAttempts} THEN NOW() + INTERVAL '15 minutes'
        ELSE auth_rate_limits.blocked_until
      END
    RETURNING attempts, blocked_until
  `;
  return rows[0];
}
