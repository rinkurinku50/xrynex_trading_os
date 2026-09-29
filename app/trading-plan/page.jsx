import EconomicCalendarCard from '@/components/EconomicCalendarCard';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import SectionHeader from '@/components/SectionHeader';
import TradingPlanChecklist from '@/components/TradingPlanChecklist';

export const dynamic = 'force-dynamic';

export default async function TradingPlanPage() {
  const session = await getSession();
  const calendar = session
    ? await prisma.economicCalendarScreenshot.findUnique({ where: { ownerId: session.user.id } })
    : null;
  const news = session
    ? await prisma.economicNews.findMany({ where: { ownerId: session.user.id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 50 })
    : [];
  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Stay aware"
        title="Trading plan"
        icon="🗓"
        description="Keep the week’s major events visible before you make decisions in the market."
      />
      <TradingPlanChecklist />
      <EconomicCalendarCard
        initialUrl={calendar?.imageUrl ?? ''}
        initialOpacity={calendar?.overlayOpacity ?? 15}
        initialNews={news}
      />
    </div>
  );
}
