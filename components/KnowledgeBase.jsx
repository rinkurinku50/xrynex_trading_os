'use client';

import { useEffect, useState } from 'react';
import { DeleteButton, Modal, RecordForm } from '@/components/Form';
import ConceptIcon, { conceptIconOptions } from '@/components/ConceptIcon';
import ConceptRichText from '@/components/ConceptRichText';
import { LuBookOpen, LuChevronDown, LuChevronUp, LuSearch, LuStar } from 'react-icons/lu';

const fields = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'icon', label: 'Navigation icon', type: 'select', options: conceptIconOptions, iconPreview: true },
  { name: 'subtitle', label: 'Summary', type: 'text' },
  { name: 'body', label: 'Detailed notes', type: 'richtext' },
  { name: 'show_in_nav', label: 'Show in Knowledge Base navigation', type: 'checkbox' },
];

const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function KnowledgeBase({ concepts }) {
  const [rows, setRows] = useState(concepts);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expandedCards, setExpandedCards] = useState(() => new Set());

  useEffect(() => setRows(concepts), [concepts]);

  const query = search.trim().toLocaleLowerCase();
  const visibleRows = query
    ? rows.filter((concept) => [concept.name, concept.subtitle, concept.body]
      .some((value) => typeof value === 'string' && value.toLocaleLowerCase().includes(query)))
    : rows;
  const favoriteRows = visibleRows.filter((concept) => concept.isFavorite);
  const otherRows = visibleRows.filter((concept) => !concept.isFavorite);

  async function toggleFavorite(concept) {
    const isFavorite = !concept.isFavorite;
    setError('');
    setRows((current) => current.map((row) => row.id === concept.id ? { ...row, isFavorite } : row));
    setSelected((current) => current?.id === concept.id ? { ...current, isFavorite } : current);
    try {
      const response = await fetch(`/api/concepts/${concept.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: isFavorite }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update favorite.');
      setRows((current) => current.map((row) => row.id === concept.id ? result : row));
      setSelected((current) => current?.id === concept.id ? result : current);
    } catch (favoriteError) {
      setRows((current) => current.map((row) => row.id === concept.id ? concept : row));
      setSelected((current) => current?.id === concept.id ? concept : current);
      setError(favoriteError.message);
    }
  }

  function conceptCard(concept) {
    const isExpanded = expandedCards.has(concept.id);
    const previewId = `concept-preview-${concept.id}`;
    return (
      <article
        key={concept.id}
        id={slug(concept.name)}
        className={`knowledge-card scroll-mt-6 ${isExpanded ? 'is-expanded' : ''}`}
      >
        <div className="knowledge-card-top">
          <span className="knowledge-card-icon"><ConceptIcon icon={concept.icon} className="h-5 w-5" /></span>
          <div className="knowledge-card-heading">
            <button type="button" className="knowledge-card-title" onClick={() => setSelected(concept)}>
              {concept.name}
            </button>
            <p className="knowledge-card-subtitle">{concept.subtitle || 'Knowledge note'}</p>
          </div>
          <button
            type="button"
            aria-label={concept.isFavorite ? `Remove ${concept.name} from favorites` : `Add ${concept.name} to favorites`}
            aria-pressed={Boolean(concept.isFavorite)}
            title={concept.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            className={`knowledge-card-favorite ${concept.isFavorite ? 'is-favorite' : ''}`}
            onClick={() => toggleFavorite(concept)}
          >
            <LuStar className="h-4 w-4" fill={concept.isFavorite ? 'currentColor' : 'none'} aria-hidden />
          </button>
        </div>
        <div id={previewId} className={`knowledge-card-preview ${isExpanded ? 'is-expanded' : ''}`}>
          {concept.body
            ? <ConceptRichText body={concept.body} />
            : <p className="knowledge-card-empty">No notes yet. Open this entry to add details.</p>}
        </div>
        <div className="knowledge-card-actions">
          <button type="button" className="knowledge-card-open" onClick={() => setSelected(concept)}>
            <LuBookOpen aria-hidden />
            Open notes
          </button>
          <button
            type="button"
            className="knowledge-card-expand"
            aria-expanded={isExpanded}
            aria-controls={previewId}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${concept.name} preview`}
            title={`${isExpanded ? 'Collapse' : 'Expand'} preview`}
            onClick={() => {
              if (isExpanded) document.getElementById(previewId)?.scrollTo({ top: 0 });
              setExpandedCards((current) => {
                const next = new Set(current);
                if (next.has(concept.id)) next.delete(concept.id);
                else next.add(concept.id);
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

  function close() {
    setSelected(null);
    setEditing(false);
  }

  return (
    <div className="knowledge-base space-y-6">
      {error && <p role="alert" className="rounded-lg border border-loss/30 bg-loss/10 px-3 py-2 text-[13px] text-loss">{error}</p>}
      <div className="knowledge-toolbar">
        <div className="knowledge-search">
          <LuSearch aria-hidden />
          <label className="sr-only" htmlFor="knowledge-search-input">Search concepts</label>
          <input
            id="knowledge-search-input"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search concepts and notes"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label="Clear search">×</button>
          )}
        </div>
        <p className="knowledge-total">{visibleRows.length} {visibleRows.length === 1 ? 'concept' : 'concepts'}</p>
      </div>
      <section aria-labelledby="concept-favorites-heading">
        <div className="knowledge-section-heading">
          <LuStar className="h-4 w-4 text-gold" fill="currentColor" aria-hidden />
          <h2 id="concept-favorites-heading">Favorites</h2>
          <span className="knowledge-count">{favoriteRows.length}</span>
        </div>
        {favoriteRows.length ? (
          <div className="knowledge-grid">{favoriteRows.map(conceptCard)}</div>
        ) : query ? (
          <p className="knowledge-empty">No favorites match “{search.trim()}”.</p>
        ) : (
          <p className="knowledge-empty">Star a concept to keep it close at hand.</p>
        )}
      </section>

      <section aria-labelledby="concept-all-heading">
        <div className="knowledge-section-heading">
          <h2 id="concept-all-heading">All concepts</h2>
          <span className="knowledge-count">{otherRows.length}</span>
        </div>
        {otherRows.length ? (
          <div className="knowledge-grid">{otherRows.map(conceptCard)}</div>
        ) : query ? (
          <p className="knowledge-empty">No other concepts match “{search.trim()}”.</p>
        ) : rows.length ? (
          <p className="knowledge-empty">All concepts are in your favorites.</p>
        ) : (
          <p className="knowledge-empty">Nothing in the knowledge base yet.</p>
        )}
      </section>

      <Modal
        open={Boolean(selected)}
        onClose={close}
        size="max-w-4xl"
        title={editing ? `Edit ${selected?.name}` : 'Knowledge base notes'}
      >
        {selected && editing ? (
          <RecordForm
            endpoint={`/api/concepts/${selected.id}`}
            fields={fields}
            initial={{ ...selected, show_in_nav: selected.showInNav }}
            method="PATCH"
            submitLabel="Save changes"
            onDone={(updated) => {
              setSelected(updated);
              setEditing(false);
            }}
          />
        ) : selected ? (
          <div className="knowledge-detail">
            <header className="knowledge-detail-heading">
              <span className="knowledge-detail-icon"><ConceptIcon icon={selected.icon} className="h-6 w-6" /></span>
              <div className="min-w-0">
                <p className="knowledge-detail-kicker">READ-ONLY NOTES</p>
                <h2>{selected.name}</h2>
                <p className="knowledge-detail-subtitle">{selected.subtitle || 'Knowledge base entry'}</p>
              </div>
            </header>
            <article className="knowledge-detail-content">
              <ConceptRichText body={selected.body} className="knowledge-detail-richtext" />
            </article>
            <div className="knowledge-detail-footer">
              <DeleteButton endpoint={`/api/concepts/${selected.id}`} label="Delete concept" onDone={close} />
              <div className="knowledge-detail-actions">
                <button type="button" className="btn" onClick={() => toggleFavorite(selected)}>
                  {selected.isFavorite ? '★ Favorited' : '☆ Add favorite'}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>
                  Edit notes
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
