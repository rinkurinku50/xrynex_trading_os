'use client';

import { useEffect, useState } from 'react';
import { DeleteButton, Modal, RecordForm } from '@/components/Form';
import ConceptRichText from '@/components/ConceptRichText';
import { fieldSets } from '@/components/NewButton';
import { Badge } from '@/components/ui';
import { driveOpen } from '@/lib/drive';
import { LuStar } from 'react-icons/lu';

export default function StrategyLab({ strategies }) {
  const [rows, setRows] = useState(strategies);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => setRows(strategies), [strategies]);

  async function toggleFavorite(strategy) {
    const isFavorite = !strategy.isFavorite;
    setError('');
    setRows((current) => current.map((row) => row.id === strategy.id ? { ...row, isFavorite } : row));
    setSelected((current) => current?.id === strategy.id ? { ...current, isFavorite } : current);
    try {
      const response = await fetch(`/api/strategies/${strategy.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: isFavorite }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update favorite.');
      setRows((current) => current.map((row) => row.id === strategy.id ? result : row));
      setSelected((current) => current?.id === strategy.id ? result : current);
    } catch (favoriteError) {
      setRows((current) => current.map((row) => row.id === strategy.id ? strategy : row));
      setSelected((current) => current?.id === strategy.id ? strategy : current);
      setError(favoriteError.message);
    }
  }

  function strategyCard(strategy) {
    return (
      <article
        key={strategy.id}
        id={`strategy-${strategy.id}`}
        className="scroll-mt-6 rounded-lg border border-line bg-panel2/40 p-4"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[14px] font-semibold text-text">
            <span className="mr-2 font-mono text-muted">{strategy.code}</span>{strategy.name}
          </h3>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label={strategy.isFavorite ? `Remove ${strategy.name} from favorites` : `Add ${strategy.name} to favorites`}
              aria-pressed={Boolean(strategy.isFavorite)}
              title={strategy.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              className={`rounded-md p-1.5 transition hover:bg-ink ${strategy.isFavorite ? 'text-gold' : 'text-muted hover:text-gold'}`}
              onClick={() => toggleFavorite(strategy)}
            >
              <LuStar className="h-4 w-4" fill={strategy.isFavorite ? 'currentColor' : 'none'} aria-hidden />
            </button>
            <Badge>{strategy.status}</Badge>
          </div>
        </div>
        {strategy.description ? (
          <ConceptRichText body={strategy.description} className="mt-2 text-[13px] text-text/80" />
        ) : (
          <p className="mt-2 text-[13px] text-text/80">No description yet.</p>
        )}
        {strategy.rules && <ConceptRichText body={strategy.rules} className="mt-2 text-[12px] text-muted" />}
        <div className="mt-3 flex items-center justify-end border-t border-line pt-3 text-[12px]">
          <span className="flex gap-3">
            {strategy.drive_url && (
              <a href={driveOpen(strategy.drive_url)} target="_blank" rel="noreferrer" className="text-muted hover:text-win">
                Drive
              </a>
            )}
            <button type="button" className="text-muted hover:text-win" onClick={() => setSelected(strategy)}>
              Edit
            </button>
            <DeleteButton endpoint={`/api/strategies/${strategy.id}`} />
          </span>
        </div>
      </article>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {error && <p role="alert" className="rounded-lg border border-loss/30 bg-loss/10 px-3 py-2 text-[13px] text-loss">{error}</p>}
        <section aria-labelledby="strategy-favorites-heading">
          <div className="mb-3 flex items-center gap-2">
            <LuStar className="h-4 w-4 text-gold" fill="currentColor" aria-hidden />
            <h2 id="strategy-favorites-heading" className="text-[15px] font-semibold text-text">Favorites</h2>
          </div>
          {rows.some((strategy) => strategy.isFavorite) ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.filter((strategy) => strategy.isFavorite).map(strategyCard)}</div>
          ) : (
            <p className="rounded-lg border border-dashed border-line px-4 py-3 text-[12px] text-muted">Favorite a strategy with the star to keep it here.</p>
          )}
        </section>

        <section aria-labelledby="strategy-all-heading">
          <h2 id="strategy-all-heading" className="mb-3 text-[15px] font-semibold text-text">All strategies</h2>
          {rows.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.filter((strategy) => !strategy.isFavorite).map(strategyCard)}</div>
          ) : (
            <p className="text-[13px] text-muted">No strategies yet. Write down the first one you want to test.</p>
          )}
        </section>
      </div>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} size="max-w-4xl" title={`Edit ${selected?.name || 'strategy'}`}>
        {selected && (
          <RecordForm
            key={selected.id}
            endpoint={`/api/strategies/${selected.id}`}
            fields={fieldSets.strategy()}
            initial={{
              ...selected,
              drive_url: selected.drive_url ?? selected.driveUrl,
              show_in_nav: selected.showInNav,
            }}
            method="PATCH"
            submitLabel="Save changes"
            onDone={() => setSelected(null)}
          />
        )}
      </Modal>
    </>
  );
}