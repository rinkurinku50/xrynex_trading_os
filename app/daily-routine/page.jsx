import DailyRoutinePlanner from '@/components/DailyRoutinePlanner';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DailyRoutinePage() {
  const session = await getSession();
  return <DailyRoutinePlanner userId={session?.user.id} />;
}
