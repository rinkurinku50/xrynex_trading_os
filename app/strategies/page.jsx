import { getStrategies } from '@/lib/queries';
import NewButton from '@/components/NewButton';
import StrategyLab from '@/components/StrategyLab';
import SectionHeader from '@/components/SectionHeader';

export const dynamic = 'force-dynamic';

export default async function StrategiesPage() {
  const strategies = await getStrategies();

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Plan with evidence"
        title="Strategy lab"
        icon="🧪"
        description="Keep your rules, references, and testing notes close to the process they are meant to support."
        action={<NewButton kind="strategy" label="+ New strategy" className="btn btn-primary" />}
      />
      <StrategyLab strategies={strategies} />
    </div>
  );
}
