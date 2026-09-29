import { getCharts } from '@/lib/queries';
import { Empty, fmtDate } from '@/components/ui';
import { DriveImage } from '@/components/DriveMedia';
import { DeleteButton } from '@/components/Form';
import NewButton from '@/components/NewButton';
import SectionHeader from '@/components/SectionHeader';
import { LuCalendarDays, LuChartNoAxesColumnIncreasing } from 'react-icons/lu';

export const dynamic = 'force-dynamic';

export default async function ChartsPage() {
  const charts = await getCharts(200);

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Read the market"
        title="Charts and analysis"
        icon="📈"
        description="Build a visual library of the setups, levels, and observations that shape your trading decisions."
        action={<NewButton kind="chart" label="+ Add a chart" className="btn btn-primary" />}
      />
      {charts.length ? (
        <div className="grid items-start gap-5 sm:grid-cols-2 2xl:grid-cols-3">
          {charts.map((c) => (
            <figure key={c.id} className="group overflow-hidden rounded-xl border border-line bg-panel2/40 transition duration-200 hover:-translate-y-0.5 hover:border-info/40 hover:bg-panel2/70 hover:shadow-xl hover:shadow-black/20">
              <div className="relative aspect-[16/10] overflow-hidden bg-[#0b1118] p-2">
                <DriveImage url={c.drive_url} alt={c.title} size="w1200" fit="contain" className="rounded-lg" />
                <span className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/65 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                  <LuChartNoAxesColumnIncreasing className="h-3.5 w-3.5 text-info" aria-hidden />
                  Chart analysis
                </span>
              </div>
              <figcaption className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 flex-1 break-words text-[15px] font-semibold leading-snug text-text">{c.title}</h3>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-ink px-2 py-1 text-[11px] text-muted">
                    <LuCalendarDays className="h-3.5 w-3.5 text-info" aria-hidden />
                    {fmtDate(c.chart_date)}
                  </span>
                </div>
                {c.instrument && (
                  <span className="inline-flex rounded-md border border-info/20 bg-info/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-info">
                    {c.instrument}
                  </span>
                )}
                {c.note && <p className="border-l-2 border-info/40 pl-3 text-[12px] leading-5 text-muted">{c.note}</p>}
                <div className="flex items-center justify-between border-t border-line pt-3">
                  <span className="text-[10px] uppercase tracking-wide text-muted/70">Open image for full size</span>
                  <DeleteButton endpoint={`/api/charts/${c.id}`} />
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <Empty>No charts saved. Add a Google Drive image link to start the library.</Empty>
      )}
    </div>
  );
}
