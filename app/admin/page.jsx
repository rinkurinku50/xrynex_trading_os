import { redirect } from 'next/navigation';
import AdminSettings from '@/components/AdminSettings';
import { getSession } from '@/lib/auth';
import { isAdminUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin Settings · Xrynex Trading OS' };

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect('/login?next=%2Fadmin');
  if (!isAdminUser(session.user)) redirect('/');

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-win">Administrator</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Admin settings</h1>
        <p className="mt-2 text-sm text-muted">Manage access settings for your Xrynex Trading OS workspace.</p>
      </header>
      <AdminSettings />
    </div>
  );
}
