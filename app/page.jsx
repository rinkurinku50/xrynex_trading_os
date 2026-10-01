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
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const [strategies, ideas, videos, charts, concepts, economicNews, session] = await Promise.all([
    getStrategies(), getIdeas(), getVideos(), getCharts(4), getConcepts(), getEconomicNews(), getSession()
  ]);

  return (
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

      <RoutineQuickView userId={session?.user.id} />

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

      <Panel title="Today" icon="🗓">
        <TodayTasks />
      </Panel>

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
  );
}

