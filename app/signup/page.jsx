import AuthForm from '@/components/AuthForm';
import { notFound } from 'next/navigation';
import { publicSignupEnabled } from '@/lib/config';

export const metadata = { title: 'Create account · Xrynex Trading OS' };
export const dynamic = 'force-dynamic';

export default async function SignupPage({ searchParams }) {
  if (!await publicSignupEnabled()) notFound();
  const params = await searchParams;
  return <AuthForm mode="signup" next={params?.next || '/'} />;
}
