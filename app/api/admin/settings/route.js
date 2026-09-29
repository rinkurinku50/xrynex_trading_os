import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/api-auth';
import { originIsAllowed } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { publicSignupAllowedByEnvironment, publicSignupEnabled } from '@/lib/config';

export const dynamic = 'force-dynamic';

async function signupStatus() {
  return {
    enabled: await publicSignupEnabled(),
    canEnable: publicSignupAllowedByEnvironment(),
  };
}

export async function GET() {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const response = NextResponse.json(await signupStatus());
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function PATCH(request) {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;
  if (!originIsAllowed(request)) return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (typeof body?.enabled !== 'boolean') {
    return NextResponse.json({ error: 'A boolean enabled value is required.' }, { status: 400 });
  }
  if (body.enabled && !publicSignupAllowedByEnvironment()) {
    return NextResponse.json({ error: 'Signup cannot be enabled in production until EMAIL_VERIFICATION_ENABLED=true.' }, { status: 403 });
  }

  await prisma.appSetting.upsert({
    where: { id: 1 },
    update: { publicSignupEnabled: body.enabled },
    create: { id: 1, publicSignupEnabled: body.enabled },
  });

  const response = NextResponse.json(await signupStatus());
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
