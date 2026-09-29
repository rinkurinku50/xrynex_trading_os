import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { clearSessionCookieOptions, originIsAllowed, SESSION_COOKIE, sha256 } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (!originIsAllowed(request)) return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 });
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token && token.length <= 128) {
    await prisma.authSession.deleteMany({ where: { tokenHash: sha256(token) } });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', clearSessionCookieOptions());
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
