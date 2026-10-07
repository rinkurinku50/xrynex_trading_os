'use client';

import { useEffect, useState } from 'react';
import { DeleteButton, Modal, RecordForm } from '@/components/Form';
import ConceptIcon, { conceptIconOptions } from '@/components/ConceptIcon';
import ConceptRichText from '@/components/ConceptRichText';
import { LuStar } from 'react-icons/lu';

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

  useEffect(() => setRows(concepts), [concepts]);

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
    return (
      <article
        key={concept.id}
        id={slug(concept.name)}
        className="scroll-mt-6 rounded-lg border border-line bg-panel2/40 p-4 transition hover:border-win/60 hover:bg-panel2"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <button type="button" className="block text-left" onClick={() => setSelected(concept)}>
              <h3 className="flex items-center gap-2 text-[14px] font-semibold text-text">
                <ConceptIcon icon={concept.icon} />{concept.name}
              </h3>
              <p className="text-[12px] text-muted">{concept.subtitle || 'Open to view details.'}</p>
            </button>
            {concept.body && <ConceptRichText body={concept.body} className="mt-2 line-clamp-3 text-[13px] text-text/85" />}
          </div>
          <button
            type="button"
            aria-label={concept.isFavorite ? `Remove ${concept.name} from favorites` : `Add ${concept.name} to favorites`}
            aria-pressed={Boolean(concept.isFavorite)}
            title={concept.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            className={`rounded-md p-2 transition hover:bg-ink ${concept.isFavorite ? 'text-gold' : 'text-muted hover:text-gold'}`}
            onClick={() => toggleFavorite(concept)}
          >
            <LuStar className="h-4 w-4" fill={concept.isFavorite ? 'currentColor' : 'none'} aria-hidden />
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
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-lg border border-loss/30 bg-loss/10 px-3 py-2 text-[13px] text-loss">{error}</p>}
      <section aria-labelledby="concept-favorites-heading">
        <div className="mb-3 flex items-center gap-2">
          <LuStar className="h-4 w-4 text-gold" fill="currentColor" aria-hidden />
          <h2 id="concept-favorites-heading" className="text-[15px] font-semibold text-text">Favorites</h2>
        </div>
        {rows.some((concept) => concept.isFavorite) ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.filter((concept) => concept.isFavorite).map(conceptCard)}</div>
        ) : (
          <p className="rounded-lg border border-dashed border-line px-4 py-3 text-[12px] text-muted">Favorite a concept with the star to keep it here.</p>
        )}
      </section>

      <section aria-labelledby="concept-all-heading">
        <h2 id="concept-all-heading" className="mb-3 text-[15px] font-semibold text-text">All concepts</h2>
        {rows.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.filter((concept) => !concept.isFavorite).map(conceptCard)}</div>
        ) : (
          <p className="text-[13px] text-muted">Nothing in the knowledge base yet.</p>
        )}
      </section>

      <Modal open={Boolean(selected)} onClose={close} size={editing ? 'max-w-4xl' : 'max-w-lg'} title={editing ? `Edit ${selected?.name}` : selected?.name || 'Concept details'}>
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
          <div className="space-y-5">
            <div>
              <p className="text-[13px] uppercase tracking-wide text-muted">{selected.subtitle || 'Knowledge base entry'}</p>
              <ConceptRichText body={selected.body} className="mt-3 text-[14px] leading-7 text-text/90" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <DeleteButton endpoint={`/api/concepts/${selected.id}`} label="Delete concept" onDone={close} />
              <div className="flex items-center gap-2">
                <button type="button" className="btn" onClick={() => toggleFavorite(selected)}>
                  {selected.isFavorite ? '★ Favorited' : '☆ Add favorite'}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>
                  Edit concept
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
