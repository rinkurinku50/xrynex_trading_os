import { compare, hashSync } from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isConfiguredAdminEmail } from '@/lib/admin';
import {
  consumeRateLimit, createSession, normalizeEmail, originIsAllowed,
  passwordHashInput, requestAddress, SESSION_COOKIE, sessionCookieOptions, sha256,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';
const DUMMY_PASSWORD_HASH = hashSync(randomBytes(32).toString('hex'), 12);

export async function POST(request) {
  if (!originIsAllowed(request)) return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password || password.length > 128) {
    return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
  }

  const [ipLimit, emailLimit] = await Promise.all([
    consumeRateLimit('login-ip', requestAddress(request), 30),
    consumeRateLimit('login-email', email, 10),
  ]);
  const now = new Date();
  if ((ipLimit.blockedUntil && ipLimit.blockedUntil > now) || (emailLimit.blockedUntil && emailLimit.blockedUntil > now)) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
  }

  let user = await prisma.user.findUnique({ where: { email } });
  const passwordMatches = await compare(passwordHashInput(password), user?.passwordHash || DUMMY_PASSWORD_HASH);
  if (!user?.passwordHash || !passwordMatches) {
    return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
  }

  if (!user.isAdmin && isConfiguredAdminEmail(user.email)) {
    user = await prisma.user.update({ where: { id: user.id }, data: { isAdmin: true } });
  }

  await prisma.authRateLimit.deleteMany({
    where: { key: { in: [sha256(`login-ip:${requestAddress(request)}`), sha256(`login-email:${email}`)] } },
  });
  const { token, expiresAt } = await createSession(user.id);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
