import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth';

export async function requireAuthenticatedApi() {
  const user = await requireApiUser();
  if (user) return user;
  return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
}

export function isAdminUser(user) {
  return user?.isAdmin === true;
}

export async function requireAdminApi() {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!isAdminUser(user)) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
  return user;
}
