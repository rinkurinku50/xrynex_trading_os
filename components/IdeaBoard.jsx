'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Empty, fmtDate } from './ui';
import { Modal, RecordForm, DeleteButton } from './Form';
import { fieldSets } from './NewButton';
import SelectMenu from '@/components/SelectMenu';

const STATUSES = ['All', 'Open', 'Testing', 'Done', 'Dropped'];

export default function IdeaBoard({ ideas, title, icon, defaultTag = 'Idea' }) {
  const router = useRouter();
  const [filter, setFilter] = useState('All');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  const shown = filter === 'All' ? ideas : ideas.filter((i) => i.status === filter);
  const activeIdeas = ideas.filter((i) => i.status === 'Open' || i.status === 'Testing').length;
  const testingIdeas = ideas.filter((i) => i.status === 'Testing').length;
  const completedIdeas = ideas.filter((i) => i.status === 'Done').length;
  const droppedIdeas = ideas.filter((i) => i.status === 'Dropped').length;

  async function setStatus(id, status) {
    setError('');
    const response = await fetch(`/api/ideas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || 'Could not update this status.');
      return;
    }
    router.refresh();
  }

  const fields = fieldSets.idea().map((f) =>
    f.name === 'tag' ? { ...f, default: defaultTag } : f
  );

  return (
    <div className="space-y-5">
      <header className="border-b border-line pb-5">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-win">Capture and validate</p>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-xl" aria-hidden>{icon}</span>
              <h1 className="font-display text-3xl tracking-wide text-white sm:text-4xl">{title}</h1>
            </div>
            <p className="mt-3 max-w-xl text-[13px] leading-5 text-muted">A focused queue for market observations, trade hypotheses, and experiments worth taking to the chart.</p>
          </div>
          <button className="btn btn-primary px-4 py-2.5" onClick={() => setOpen(true)}>
            <span aria-hidden>＋</span> {defaultTag === 'Question' ? 'New question' : 'New idea'}
          </button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ['Active', activeIdeas, 'text-win'],
          ['Testing', testingIdeas, 'text-gold'],
          ['Validated', completedIdeas, 'text-info'],
          ['Dropped', droppedIdeas, 'text-muted'],
        ].map(([label, value, tone]) => (
          <div key={label} className="rounded-xl border border-line bg-panel/60 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
            <p className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
          </div>
        ))}
      </div>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="text-[15px] font-semibold text-text">Idea queue</h2>
            <p className="mt-1 text-[12px] text-muted">{shown.length} {shown.length === 1 ? 'entry' : 'entries'} in view</p>
          </div>
          <div className="flex max-w-full overflow-x-auto rounded-lg border border-line bg-ink p-1" role="group" aria-label="Filter ideas by status">
            {STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                aria-pressed={filter === status}
                onClick={() => setFilter(status)}
                className={`shrink-0 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${filter === status ? 'bg-panel2 text-white shadow-sm' : 'text-muted hover:text-text'}`}
              >
                {status === 'All' ? 'All ideas' : status}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {error && <p role="alert" className="mb-3 rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-[13px] text-loss">{error}</p>}
          {shown.length ? (
            <ul className="space-y-2">
              {shown.map((i) => (
                <li key={i.id} className="group flex flex-wrap items-center gap-4 rounded-xl border border-line bg-panel2/30 p-4 transition-colors hover:border-info/40 hover:bg-panel2/60">
                  <span className={`h-9 w-1 shrink-0 rounded-full ${i.status === 'Open' ? 'bg-win' : i.status === 'Testing' ? 'bg-gold' : i.status === 'Done' ? 'bg-info' : 'bg-line'}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14px] font-medium text-text">{i.title}</p>
                      <Badge>{i.tag}</Badge>
                    </div>
                    <p className="mt-1 truncate text-[12px] text-muted">{i.note || 'No note added yet.'}</p>
                  </div>
                  <div className="flex w-full items-center justify-between gap-3 border-t border-line/70 pt-3 sm:w-auto sm:border-t-0 sm:pt-0">
                    <span className="font-mono text-[11px] text-muted">{fmtDate(i.idea_date)}</span>
                    <div className="flex items-center gap-2">
                      <SelectMenu
                        value={i.status}
                        options={['Open', 'Testing', 'Done', 'Dropped']}
                        onChange={(status) => setStatus(i.id, status)}
                        label={`Status for ${i.title}`}
                        className="w-[120px] max-w-[42vw]"
                      />
                      <DeleteButton endpoint={`/api/ideas/${i.id}`} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nothing here yet. Capture the next thing you notice on the chart.</Empty>
          )}
        </div>
      </section>

      <Modal open={open} onClose={() => setOpen(false)} title={defaultTag === 'Question' ? 'New question' : 'New idea'}>
        <RecordForm endpoint="/api/ideas" fields={fields} submitLabel="Save" onDone={() => setOpen(false)} />
      </Modal>
    </div>
  );
}
