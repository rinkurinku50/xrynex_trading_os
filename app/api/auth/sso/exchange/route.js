import { randomBytes } from 'node:crypto';
import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isConfiguredAdminEmail } from '@/lib/admin';
import { consumeRateLimit, normalizeEmail, requestAddress, sha256, validEmail } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function configuration() {
  const secret = process.env.LEGACY_SSO_SECRET;
  const issuer = process.env.LEGACY_SSO_ISSUER;
  const appUrl = process.env.APP_URL;
  if (!secret || Buffer.byteLength(secret) < 32 || !issuer || !appUrl) return null;
  try {
    const parsed = new URL(appUrl);
    if (parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username || parsed.password) return null;
    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') return null;
    return { secret, issuer, appUrl: parsed.origin };
  } catch {
    return null;
  }
}

export async function POST(request) {
  const config = configuration();
  if (!config) return NextResponse.json({ error: 'Single sign-on is not configured.' }, { status: 503 });

  const rate = await consumeRateLimit('sso-exchange-ip', requestAddress(request), 30);
  if (rate.blockedUntil && rate.blockedUntil > new Date()) {
    return NextResponse.json({ error: 'Too many SSO attempts. Try again later.' }, { status: 429 });
  }

  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer ([A-Za-z0-9._~-]{20,8192})$/);
  if (!match) return NextResponse.json({ error: 'A signed SSO assertion is required.' }, { status: 401 });

  const allowedAudience = process.env.LEGACY_SSO_AUDIENCES
    ?.split(',').map((value) => value.trim()).filter(Boolean) || [];
  if (!allowedAudience.includes('trading-os')) allowedAudience.push('trading-os');

  let payload;
  try {
    ({ payload } = await jwtVerify(match[1], new TextEncoder().encode(config.secret), {
      algorithms: ['HS256'],
      issuer: config.issuer,
      audience: allowedAudience,
      maxTokenAge: '2 minutes',
      clockTolerance: 5,
    }));
  } catch {
    return NextResponse.json({ error: 'SSO assertion is invalid or expired.' }, { status: 401 });
  }

  const subject = typeof payload.sub === 'string' ? payload.sub : '';
  const email = normalizeEmail(payload.email);
  const jti = typeof payload.jti === 'string' ? payload.jti : '';
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!subject || subject.length > 255 || !validEmail(email) || payload.email_verified !== true
      || !jti || jti.length > 255 || !Number.isInteger(payload.iat) || !Number.isInteger(payload.exp)
      || payload.exp <= nowSeconds || payload.exp - payload.iat > 120) {
    return NextResponse.json({ error: 'SSO assertion is missing required verified identity claims.' }, { status: 401 });
  }

  const code = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 60_000);
  const name = typeof payload.name === 'string' ? payload.name.trim().slice(0, 80) : null;

  try {
    await prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.ssoAssertionUse.deleteMany({ where: { expiresAt: { lt: now } } });
      await tx.ssoLoginCode.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { consumedAt: { not: null } }] } });
      await tx.ssoAssertionUse.create({ data: { jti, expiresAt: new Date(payload.exp * 1000) } });

      let user = await tx.user.findUnique({ where: { legacySubject: subject } });
      if (!user) {
        user = await tx.user.findUnique({ where: { email } });
        if (user?.passwordHash && !user.emailVerifiedAt) {
          throw new Error('An unverified password account already uses this email; automatic linking is disabled.');
        }
        if (user?.legacySubject && user.legacySubject !== subject) {
          throw new Error('This email is already linked to another legacy identity.');
        }
      }

      if (!user) {
        user = await tx.user.create({
          data: {
            email,
            name,
            emailVerifiedAt: new Date(),
            legacySubject: subject,
            isAdmin: isConfiguredAdminEmail(email),
          },
        });
      } else {
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            email,
            name: name || user.name,
            emailVerifiedAt: user.emailVerifiedAt || new Date(),
            legacySubject: subject,
            isAdmin: user.isAdmin || isConfiguredAdminEmail(email),
          },
        });
      }

      await tx.ssoLoginCode.create({ data: { codeHash: sha256(code), userId: user.id, expiresAt } });
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'This SSO assertion has already been used or the identity is already linked.' }, { status: 401 });
    }
    if (error?.message === 'This email is already linked to another legacy identity.') {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error?.message === 'An unverified password account already uses this email; automatic linking is disabled.') {
      return NextResponse.json({ error: 'A password account already uses this email. Automatic account merging is disabled for security; contact the workspace administrator to link accounts.' }, { status: 409 });
    }
    throw error;
  }

  const loginUrl = new URL('/api/auth/sso/consume', config.appUrl);
  loginUrl.searchParams.set('code', code);
  const response = NextResponse.json({ login_url: loginUrl.toString(), expires_in: 60 });
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Pragma', 'no-cache');
  return response;
}
