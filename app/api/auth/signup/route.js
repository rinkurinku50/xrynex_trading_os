import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isConfiguredAdminEmail } from '@/lib/admin';
import {
  consumeRateLimit, createSession, normalizeEmail, originIsAllowed,
  passwordHashInput, requestAddress, SESSION_COOKIE, sessionCookieOptions, sha256, validEmail,
} from '@/lib/auth';
import { publicSignupEnabled } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (!await publicSignupEnabled()) return NextResponse.json({ error: 'Public signup is disabled. Ask your workspace administrator for access.' }, { status: 403 });
  if (!originIsAllowed(request)) return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
  if (!validEmail(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  if (password.length < 12 || password.length > 128) {
    return NextResponse.json({ error: 'Password must be between 12 and 128 characters.' }, { status: 400 });
  }

  const [ipLimit, emailLimit] = await Promise.all([
    consumeRateLimit('signup-ip', requestAddress(request), 10),
    consumeRateLimit('signup-email', email, 3),
  ]);
  const now = new Date();
  if ((ipLimit.blockedUntil && ipLimit.blockedUntil > now) || (emailLimit.blockedUntil && emailLimit.blockedUntil > now)) {
    return NextResponse.json({ error: 'Too many signup attempts. Try again in 15 minutes.' }, { status: 429 });
  }

  const passwordHash = await hash(passwordHashInput(password), 12);
  let user;
  try {
    user = await prisma.user.create({
      data: { email, name: name || null, passwordHash, isAdmin: isConfiguredAdminEmail(email) },
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'An account with that email already exists. Log in instead.' }, { status: 409 });
    }
    throw error;
  }

  await prisma.authRateLimit.deleteMany({
    where: { key: { in: [sha256(`signup-ip:${requestAddress(request)}`), sha256(`signup-email:${email}`)] } },
  });
  const { token, expiresAt } = await createSession(user.id);
  const response = NextResponse.json({ ok: true }, { status: 201 });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
