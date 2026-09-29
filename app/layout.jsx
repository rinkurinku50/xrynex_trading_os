import './globals.css';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import AccountMenu from '@/components/AccountMenu';
import { getSession } from '@/lib/auth';
import { isAdminUser } from '@/lib/api-auth';
import WeeklyCalendarReminder from '@/components/WeeklyCalendarReminder';
import ConfirmDialogProvider from '@/components/ConfirmDialogProvider';

export const metadata = {
  title: 'Xrynex Trading OS',
  description: 'Xrynex Trading OS — learn, plan, execute, and improve your trading process.',
  icons: {
    icon: '/xrynex-logo.png',
    apple: '/xrynex-logo.png',
  },
};

export default async function RootLayout({ children }) {
  const pathname = (await headers()).get('x-pathname') || '/';
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const session = isAuthPage ? null : await getSession();

  if (!isAuthPage && !session) {
    redirect(`/login?next=${encodeURIComponent(pathname)}`);
  }

  return (
    <html lang="en">
      <body className="min-h-screen">
        <ConfirmDialogProvider>
          <div className="flex min-h-screen min-w-0 flex-col lg:flex-row">
            {!isAuthPage && <Sidebar isAdmin={isAdminUser(session?.user)} />}
            <main className={`relative min-w-0 flex-1 overflow-x-hidden p-3 sm:p-4 lg:p-6 ${isAuthPage ? 'flex items-center justify-center' : ''}`}>
              {pathname === '/login' && (
                <div className="pointer-events-none absolute inset-x-0 top-12 flex justify-center" aria-hidden="true">
                  <img src="/xrynex-logo.png" alt="" className="w-[min(42vw,360px)] mix-blend-screen opacity-20" />
                </div>
              )}
              <div className={`relative z-10 w-full ${isAuthPage ? 'flex justify-center' : ''}`}>
                {!isAuthPage && session && <WeeklyCalendarReminder />}
                {!isAuthPage && session && <AccountMenu user={{ name: session.user.name, email: session.user.email }} />}
                {children}
              </div>
            </main>
          </div>
        </ConfirmDialogProvider>
      </body>
    </html>
  );
}
