import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Empty, fmtDate } from '@/components/ui';
import SectionHeader from '@/components/SectionHeader';

export const dynamic = 'force-dynamic';

export default async function ArchivePage() {
  const user = (await getSession()).user;
  const ideaRows = await prisma.idea.findMany({ where: { ownerId: user.id, status: 'Dropped' }, orderBy: { ideaDate: 'desc' } });
  const dropped = ideaRows.map((row) => ({ ...row, idea_date: row.ideaDate }));

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Review without noise"
        title="Archive"
        icon="🚫"
        description="Keep discarded hypotheses visible long enough to learn from them, without letting them crowd the active queue."
      />
      <section className="panel">
        <header className="panel-head">
          <h2 className="panel-title">Dropped ideas</h2>
        </header>
        <div className="panel-body">
        {dropped.length ? (
          <ul className="space-y-2">
            {dropped.map((i) => (
              <li key={i.id} className="flex justify-between rounded-lg border border-line bg-panel2/40 p-3 text-[13px]">
                <span className="text-text/80">{i.title}</span>
                <span className="text-muted">{fmtDate(i.idea_date)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Nothing dropped yet.</Empty>
        )}
        </div>
      </section>
    </div>
  );
}
