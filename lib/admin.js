import { normalizeEmail } from '@/lib/auth';

export function isConfiguredAdminEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean)
    .includes(normalizedEmail);
}