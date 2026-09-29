import { prisma } from '@/lib/db';

export function publicSignupAllowedByEnvironment() {
  return process.env.NODE_ENV !== 'production' || process.env.EMAIL_VERIFICATION_ENABLED === 'true';
}

export async function publicSignupEnabled() {
  const setting = await prisma.appSetting.findUnique({ where: { id: 1 } });
  const enabled = setting?.publicSignupEnabled ?? process.env.ENABLE_PUBLIC_SIGNUP === 'true';
  return enabled && publicSignupAllowedByEnvironment();
}
