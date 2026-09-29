import AuthForm from '@/components/AuthForm';
import { publicSignupEnabled } from '@/lib/config';

export const metadata = { title: 'Log in · Xrynex Trading OS' };
export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  return <AuthForm mode="login" next={params?.next || '/'} errorCode={params?.error || ''} signupEnabled={await publicSignupEnabled()} />;
}
