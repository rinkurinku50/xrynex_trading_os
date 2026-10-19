'use client';

import { useEffect, useState } from 'react';
import { DeleteButton, Modal, RecordForm } from '@/components/Form';
import ConceptRichText from '@/components/ConceptRichText';
import { fieldSets } from '@/components/NewButton';
import { Badge } from '@/components/ui';
import { driveOpen } from '@/lib/drive';
import { LuBookOpen, LuChevronDown, LuChevronUp, LuSearch, LuStar } from 'react-icons/lu';

export default function StrategyLab({ strategies }) {
  const [rows, setRows] = useState(strategies);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expandedCards, setExpandedCards] = useState(() => new Set());

  useEffect(() => setRows(strategies), [strategies]);

  const query = search.trim().toLocaleLowerCase();
  const visibleRows = query
    ? rows.filter((strategy) => [strategy.code, strategy.name, strategy.status, strategy.description, strategy.rules]
      .some((value) => typeof value === 'string' && value.toLocaleLowerCase().includes(query)))
    : rows;
  const favoriteRows = visibleRows.filter((strategy) => strategy.isFavorite);
  const otherRows = visibleRows.filter((strategy) => !strategy.isFavorite);

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
      setSelected((current) => current?.id === strategy.id ? { ...current, ...result } : current);
    } catch (favoriteError) {
      setRows((current) => current.map((row) => row.id === strategy.id ? strategy : row));
      setSelected((current) => current?.id === strategy.id ? { ...current, ...strategy } : current);
      setError(favoriteError.message);
    }
  }

  function strategyCard(strategy) {
    const isExpanded = expandedCards.has(strategy.id);
    const previewId = `strategy-preview-${strategy.id}`;
    return (
      <article
        key={strategy.id}
        id={`strategy-${strategy.id}`}
        className={`knowledge-card scroll-mt-6 ${isExpanded ? 'is-expanded' : ''}`}
      >
        <div className="knowledge-card-top">
          <span className="strategy-card-code">{strategy.code || 'ST'}</span>
          <div className="knowledge-card-heading">
            <button type="button" className="knowledge-card-title" onClick={() => { setSelected(strategy); setEditing(false); }}>
              {strategy.name}
            </button>
            <div className="strategy-card-status"><Badge>{strategy.status}</Badge></div>
          </div>
          <button
            type="button"
            aria-label={strategy.isFavorite ? `Remove ${strategy.name} from favorites` : `Add ${strategy.name} to favorites`}
            aria-pressed={Boolean(strategy.isFavorite)}
            title={strategy.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            className={`knowledge-card-favorite ${strategy.isFavorite ? 'is-favorite' : ''}`}
            onClick={() => toggleFavorite(strategy)}
          >
            <LuStar className="h-4 w-4" fill={strategy.isFavorite ? 'currentColor' : 'none'} aria-hidden />
          </button>
        </div>
        <div id={previewId} className={`knowledge-card-preview strategy-card-preview ${isExpanded ? 'is-expanded' : ''}`}>
          <section className="strategy-preview-block strategy-preview-description" aria-label="Description">
            <p className="strategy-preview-label">Description</p>
            {strategy.description
              ? <ConceptRichText body={strategy.description} />
              : <p className="knowledge-card-empty">No description added yet.</p>}
          </section>
          {strategy.rules && (
            <section className="strategy-preview-block strategy-preview-rules" aria-label="Rules">
              <p className="strategy-preview-label">Rules</p>
              <ConceptRichText body={strategy.rules} />
            </section>
          )}
        </div>
        <div className="knowledge-card-actions strategy-card-actions">
          <button type="button" className="knowledge-card-open" onClick={() => { setSelected(strategy); setEditing(false); }}>
            <LuBookOpen aria-hidden />Open strategy
          </button>
          <div className="video-card-actions">
            {strategy.drive_url && (
              <a href={driveOpen(strategy.drive_url)} target="_blank" rel="noreferrer" aria-label={`Open ${strategy.name} Drive reference`} title="Open Drive reference">
                <span>Drive</span>
              </a>
            )}
            <button type="button" aria-label={`Edit ${strategy.name}`} title="Edit strategy" onClick={() => { setSelected(strategy); setEditing(true); }}>
              Edit
            </button>
            <DeleteButton endpoint={`/api/strategies/${strategy.id}`} />
          </div>
          <button
            type="button"
            className="knowledge-card-expand"
            aria-expanded={isExpanded}
            aria-controls={previewId}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${strategy.name} preview`}
            title={`${isExpanded ? 'Collapse' : 'Expand'} preview`}
            onClick={() => {
              if (isExpanded) document.getElementById(previewId)?.scrollTo({ top: 0 });
              setExpandedCards((current) => {
                const next = new Set(current);
                if (next.has(strategy.id)) next.delete(strategy.id);
                else next.add(strategy.id);
                return next;
              });
            }}
          >
            {isExpanded ? <LuChevronUp aria-hidden /> : <LuChevronDown aria-hidden />}
          </button>
        </div>
      </article>
    );
  }

  return (
    <>
      <div className="knowledge-base space-y-6">
        {error && <p role="alert" className="rounded-lg border border-loss/30 bg-loss/10 px-3 py-2 text-[13px] text-loss">{error}</p>}
        <div className="knowledge-toolbar">
          <div className="knowledge-search">
            <LuSearch aria-hidden />
            <label className="sr-only" htmlFor="strategy-lab-search">Search strategies</label>
            <input id="strategy-lab-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search strategies, descriptions, and rules" />
            {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search">×</button>}
          </div>
          <p className="knowledge-total">{visibleRows.length} {visibleRows.length === 1 ? 'strategy' : 'strategies'}</p>
        </div>
        <section aria-labelledby="strategy-favorites-heading">
          <div className="knowledge-section-heading">
            <LuStar className="h-4 w-4 text-gold" fill="currentColor" aria-hidden />
            <h2 id="strategy-favorites-heading">Favorites</h2>
            <span className="knowledge-count">{favoriteRows.length}</span>
          </div>
          {favoriteRows.length ? (
            <div className="knowledge-grid">{favoriteRows.map(strategyCard)}</div>
          ) : query ? (
            <p className="knowledge-empty">No favorite strategies match “{search.trim()}”.</p>
          ) : (
            <p className="knowledge-empty">Favorite a strategy to keep it close at hand.</p>
          )}
        </section>

        <section aria-labelledby="strategy-all-heading">
          <div className="knowledge-section-heading">
            <h2 id="strategy-all-heading">All strategies</h2>
            <span className="knowledge-count">{otherRows.length}</span>
          </div>
          {otherRows.length ? (
            <div className="knowledge-grid">{otherRows.map(strategyCard)}</div>
          ) : query ? (
            <p className="knowledge-empty">No other strategies match “{search.trim()}”.</p>
          ) : rows.length ? (
            <p className="knowledge-empty">All strategies are in your favorites.</p>
          ) : (
            <p className="knowledge-empty">No strategies yet. Write down the first one you want to test.</p>
          )}
        </section>
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => { setSelected(null); setEditing(false); }}
        size="max-w-4xl"
        title={editing ? `Edit ${selected?.name || 'strategy'}` : 'Strategy details'}
      >
        {selected && editing ? (
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
            onDone={(updated) => {
              setSelected(null);
              setEditing(false);
              setRows((current) => current.map((row) => row.id === updated.id ? updated : row));
            }}
          />
        ) : selected ? (
          <div className="knowledge-detail">
            <header className="knowledge-detail-heading">
              <span className="knowledge-detail-icon strategy-detail-code">{selected.code || 'ST'}</span>
              <div className="min-w-0">
                <p className="knowledge-detail-kicker">READ-ONLY STRATEGY</p>
                <h2>{selected.name}</h2>
                <div className="strategy-detail-status"><Badge>{selected.status}</Badge></div>
              </div>
            </header>
            <article className="knowledge-detail-content strategy-detail-content">
              <h3>Description</h3>
              <ConceptRichText body={selected.description} className="knowledge-detail-richtext" />
              {selected.rules && (
                <>
                  <h3>Rules</h3>
                  <ConceptRichText body={selected.rules} className="knowledge-detail-richtext" />
                </>
              )}
            </article>
            <div className="knowledge-detail-footer">
              <DeleteButton endpoint={`/api/strategies/${selected.id}`} onDone={() => { setSelected(null); setEditing(false); }} />
              <div className="knowledge-detail-actions">
                {selected.drive_url && <a href={driveOpen(selected.drive_url)} target="_blank" rel="noreferrer" className="btn">Open Drive</a>}
                <button type="button" className="btn" onClick={() => toggleFavorite(selected)}>
                  {selected.isFavorite ? '★ Favorited' : '☆ Add favorite'}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>Edit strategy</button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}