import Link from 'next/link';
import {
  getStrategies, getIdeas, getVideos, getCharts, getConcepts, getEconomicNews
} from '@/lib/queries';
import { Panel, ViewAll, Badge, Empty, fmtDate } from '@/components/ui';
import { DriveImage } from '@/components/DriveMedia';
import NewButton from '@/components/NewButton';
import EconomicNewsCard from '@/components/EconomicNewsCard';
import TodayTasks from '@/components/TodayTasks';
import RoutineQuickView from '@/components/RoutineQuickView';
import MindsetDisciplinePreview from '@/components/MindsetDisciplinePreview';
import { getSession } from '@/lib/auth';
import DashboardTabs from '@/components/DashboardTabs';
import { LuArrowUpRight } from 'react-icons/lu';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const [strategies, ideas, videos, charts, concepts, economicNews, session] = await Promise.all([
    getStrategies(), getIdeas(), getVideos(), getCharts(4), getConcepts(), getEconomicNews(), getSession()
  ]);

  return (
    <DashboardTabs>
    <div className="space-y-4">
      {/* Hero */}
      <header className="panel overflow-hidden bg-gradient-to-r from-[#0e1620] via-[#101b26] to-[#0d1a17] px-4 py-6 sm:px-6 sm:py-7">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <h1 className="font-display text-3xl tracking-wide text-white sm:text-5xl">Xrynex Trading OS</h1>
            <nav className="mt-2 flex gap-4 text-[14px] text-text/80">
              <Link href="/concepts" className="hover:text-win">Learn</Link>
              <span className="text-line">|</span>
              <Link href="/strategies" className="hover:text-win">Plan</Link>
              <span className="text-line">|</span>
              <Link href="/ideas" className="hover:text-win">Capture</Link>
            </nav>
          </div>
          <figure className="max-w-xs text-left sm:text-right">
            <blockquote className="text-[14px] leading-relaxed text-text/90">
              “It’s not about being right, it’s about following your plan.”
            </blockquote>
            <figcaption className="mt-1 text-[12px] text-muted">— Trader mindset</figcaption>
          </figure>
        </div>
      </header>

      <a href="/trading-dashboard-split-view.html" className="split-view-launch group relative isolate block overflow-hidden rounded-xl border border-white/[0.09] px-4 py-4 shadow-lg shadow-black/10 transition duration-200 hover:-translate-y-0.5 hover:border-amber-300/30 hover:shadow-xl hover:shadow-black/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 sm:px-5">
        <span className="split-view-launch-grid pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.19em] text-amber-300">Trading Command Center <span className="mx-1 text-white/20">/</span> Dual view</p>
            <h2 className="mt-1 text-base font-semibold text-white">Plan with both monitors in view</h2>
            <p className="mt-1 text-[12px] text-slate-400">Trading Plan Monitor and Mistake Monitor, side by side.</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <div className="hidden items-center gap-2 rounded-lg border border-white/[0.08] bg-black/15 px-3 py-2 text-[9px] font-semibold tracking-wide text-slate-300 sm:flex" aria-hidden="true">
              <span>TRADING PLAN</span><span className="h-4 w-px bg-amber-300/60" /><span>MISTAKE MONITOR</span>
            </div>
            <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-300/25 bg-amber-300/[0.08] px-3 text-[11px] font-semibold text-amber-100 transition group-hover:bg-amber-300/[0.14]">
              <span>Open split view</span><LuArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </div>
      </a>

      <MindsetDisciplinePreview />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <RoutineQuickView userId={session?.user.id} />
        <TodayTasks />
      </div>

      {/* Row 1 */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Quick actions" icon="⚡">
          <div className="grid grid-cols-2 gap-3">
            <NewButton kind="idea" label="+ New idea" />
            <NewButton kind="video" label="+ Video note" />
            <NewButton kind="chart" label="+ Add chart" />
            <NewButton kind="strategy" label="+ New strategy" />
          </div>
        </Panel>

        <EconomicNewsCard initialNews={economicNews} compact />

      </div>

      {/* Row 3 */}
      <div className="grid gap-4 xl:grid-cols-4">
        <Panel title="Video notes" icon="🎬" action={<ViewAll href="/videos" />}>
          <ul className="divide-y divide-line">
            {videos.slice(0, 5).map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-[13px] text-text">{v.title}</div>
                  <div className="text-[12px] text-muted">{v.creator} · {v.topic}</div>
                </div>
                <span className="shrink-0 text-[12px] text-muted">{fmtDate(v.watched_on)}</span>
              </li>
            ))}
          </ul>
          {!videos.length && <Empty>No videos saved yet.</Empty>}
        </Panel>

        <Panel title="Strategy lab" icon="🧪" action={<ViewAll href="/strategies" />}>
          <ul className="divide-y divide-line">
            {strategies.slice(0, 6).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 py-2.5">
                <span className="truncate text-[13px] text-text">
                  <span className="mr-2 font-mono text-muted">{s.code}</span>{s.name}
                </span>
                <Badge>{s.status}</Badge>
              </li>
            ))}
          </ul>
          {!strategies.length && <Empty>No strategies yet.</Empty>}
        </Panel>

        <Panel title="Key concepts" icon="🔑" action={<ViewAll href="/concepts" />}>
          <ul className="divide-y divide-line">
            {concepts.slice(2, 9).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-[13px] text-text">{c.name}</span>
                <span className="truncate text-[12px] text-muted">{c.subtitle}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Idea inbox" icon="💡" action={<ViewAll href="/ideas" />}>
          <ul className="divide-y divide-line">
            {ideas.slice(0, 5).map((i) => (
              <li key={i.id} className="flex items-start justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <div className="text-[13px] text-text">{i.title}</div>
                  <div className="text-[12px] text-muted">{fmtDate(i.idea_date)} · {i.note}</div>
                </div>
                <Badge>{i.tag}</Badge>
              </li>
            ))}
          </ul>
          {!ideas.length && <Empty>Capture the first idea from Quick actions.</Empty>}
        </Panel>
      </div>

      <Panel title="Recent charts" icon="📈" action={<ViewAll href="/charts" />}>
        {charts.length ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {charts.map((c) => (
              <figure key={c.id} className="overflow-hidden rounded-lg border border-line bg-ink">
                <div className="h-24">
                  <DriveImage url={c.drive_url} alt={c.title} className="h-24" size="w400" />
                </div>
                <figcaption className="px-2 py-2">
                  <div className="truncate text-[13px] text-text">{c.title}</div>
                  <div className="text-[12px] text-muted">{fmtDate(c.chart_date)}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <Empty>No charts yet. Paste a Google Drive image link to add one.</Empty>
        )}
      </Panel>

      <footer className="panel flex items-center justify-between px-5 py-3 text-[13px] text-muted">
        <span>Better decisions → better systems → better results</span>
        <span>Progress, not perfection.</span>
      </footer>
    </div>
    </DashboardTabs>
  );
}

