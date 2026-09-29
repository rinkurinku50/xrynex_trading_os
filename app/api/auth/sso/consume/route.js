import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { claimLegacyWorkspace, SESSION_COOKIE, sessionCookieOptions, sha256, SESSION_TTL_MS } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const code = request.nextUrl.searchParams.get('code') || '';
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(code)) {
    return NextResponse.redirect(new URL('/login?error=sso', request.url), { headers: { 'Referrer-Policy': 'no-referrer' } });
  }

  const token = randomBytes(32).toString('base64url');
  const tokenHash = sha256(token);
  const sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const now = new Date();
  let accepted = false;

  const headers = new Headers({
    'Cache-Control': 'no-store, max-age=0',
    'Referrer-Policy': 'no-referrer',
  });

  try {
    await prisma.$transaction(async (tx) => {
      const result = await tx.ssoLoginCode.updateMany({
        where: { codeHash: sha256(code), consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (result.count !== 1) return;

      const loginCode = await tx.ssoLoginCode.findUnique({ where: { codeHash: sha256(code) } });
      if (!loginCode) return;
      await claimLegacyWorkspace(tx, loginCode.userId);
      await tx.authSession.create({ data: { tokenHash, userId: loginCode.userId, expiresAt: sessionExpiresAt } });
      accepted = true;
    });
  } catch {
    // Do not log the one-time code or let an unexpected DB error produce a blank response.
    return NextResponse.redirect(new URL('/login?error=sso', request.url), { headers });
  }

  if (!accepted) return NextResponse.redirect(new URL('/login?error=sso', request.url), { headers });

  const response = NextResponse.redirect(new URL('/', request.url), { headers });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(sessionExpiresAt));
  return response;
}
