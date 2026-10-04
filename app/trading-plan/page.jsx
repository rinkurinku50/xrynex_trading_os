import EconomicCalendarCard from '@/components/EconomicCalendarCard';
import EconomicNewsCard from '@/components/EconomicNewsCard';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import SectionHeader from '@/components/SectionHeader';
import TradingPlanChecklist from '@/components/TradingPlanChecklist';
import TradingPlanConfiguredSection from '@/components/TradingPlanConfiguredSection';
import { DEFAULT_TRADING_PLAN_LAYOUT } from '@/lib/workspace-defaults';
import { LuMaximize2, LuSettings } from 'react-icons/lu';

export const dynamic = 'force-dynamic';

export default async function TradingPlanPage() {
  const session = await getSession();
  const [calendar, news, layoutPreference] = session ? await Promise.all([
    prisma.economicCalendarScreenshot.findUnique({ where: { ownerId: session.user.id } }),
    prisma.economicNews.findMany({ where: { ownerId: session.user.id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 50 }),
    prisma.userPreference.findUnique({ where: { ownerId_key: { ownerId: session.user.id, key: 'trading-plan-layout' } } }),
  ]) : [null, [], null];
  let layout = DEFAULT_TRADING_PLAN_LAYOUT;
  if (layoutPreference?.value) {
    try {
      const savedLayout = JSON.parse(layoutPreference.value);
      if (Array.isArray(savedLayout.sections)) layout = savedLayout;
    } catch {
      layout = DEFAULT_TRADING_PLAN_LAYOUT;
    }
  }
  const visibleSections = layout.sections.filter((section) => section.enabled !== false && (
    section.type !== 'checklist'
    || !(section.subsections || []).length
    || section.subsections.some((subsection) => subsection.enabled !== false)
  ));

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Stay aware"
        title="Trading plan"
        icon="🗓"
        description="Keep the week’s major events visible before you make decisions in the market."
        action={<div className="flex flex-wrap gap-2"><a href="/trading-plan-builder.html" target="_blank" rel="noopener noreferrer" className="btn"><LuSettings className="h-4 w-4" aria-hidden="true" /><span>Customize layout</span></a><a href="/trading-plan-monitor.html" target="_blank" rel="noopener noreferrer" className="btn btn-primary"><LuMaximize2 className="h-4 w-4" aria-hidden="true" /><span>Open monitor</span></a></div>}
      />
      {visibleSections.map((section) => {
        if (section.type === 'checklist') {
          const hiddenGroupIds = (section.subsections || []).filter((subsection) => subsection.enabled === false).map((subsection) => subsection.id);
          return <TradingPlanChecklist key={section.id} title={section.title} hiddenGroupIds={hiddenGroupIds} />;
        }
        if (section.type === 'scheduler') return <EconomicNewsCard key={section.id} sectionTitle={section.title} initialNews={news} />;
        if (section.type === 'weekly-calendar') {
          return <EconomicCalendarCard
            key={section.id}
            title={section.title}
            showNews={false}
            initialUrl={calendar?.imageUrl ?? ''}
            initialOpacity={calendar?.overlayOpacity ?? 15}
            initialZoom={section.zoom ?? 100}
            imageView={section.view ?? 'fit'}
          />;
        }
        return <TradingPlanConfiguredSection key={section.id} section={section} />;
      })}
      {!visibleSections.length && <div className="panel px-5 py-8 text-center text-sm text-muted">All Trading Plan sections are hidden. Use Customize layout to show a section.</div>}
    </div>
  );
}
