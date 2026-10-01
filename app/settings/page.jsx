import ReminderSettings from '@/components/ReminderSettings';
import SectionHeader from '@/components/SectionHeader';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getSession();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <SectionHeader
        eyebrow="Personalize your workspace"
        title="Settings"
        icon="⚙️"
        description="Manage notification preferences for your daily trading workflow."
      />
      <ReminderSettings userId={session?.user.id} />
    </div>
  );
}
