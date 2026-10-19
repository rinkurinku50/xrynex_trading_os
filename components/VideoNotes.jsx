'use client';

import { useEffect, useState } from 'react';
import { DeleteButton, Modal, RecordForm } from '@/components/Form';
import ConceptRichText from '@/components/ConceptRichText';
import { DriveVideo } from '@/components/DriveMedia';
import { fmtDate } from '@/components/ui';
import { videoOpen } from '@/lib/drive';
import { LuBookOpen, LuCalendarDays, LuChevronDown, LuChevronUp, LuCirclePlay, LuExternalLink, LuPencil, LuSearch, LuStar, LuTag, LuUserRound } from 'react-icons/lu';

const fields = [
  { name: 'title', label: 'Title', type: 'text', required: true },
  { name: 'creator', label: 'Creator', type: 'text' },
  { name: 'topic', label: 'Topic', type: 'text' },
  { name: 'watched_on', label: 'Watched on', type: 'date' },
  { name: 'drive_url', label: 'Video link', type: 'text' },
  { name: 'notes', label: 'Notes', type: 'richtext' },
];

export default function VideoNotes({ videos }) {
  const [rows, setRows] = useState(videos);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [favoriteError, setFavoriteError] = useState('');
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedCards, setExpandedCards] = useState(() => new Set());

  useEffect(() => setRows(videos), [videos]);

  const query = search.trim().toLocaleLowerCase();
  const visibleRows = query
    ? rows.filter((video) => [video.title, video.creator, video.topic, video.notes]
      .some((value) => typeof value === 'string' && value.toLocaleLowerCase().includes(query)))
    : rows;
  const favoriteRows = visibleRows.filter((video) => video.isFavorite);
  const otherRows = visibleRows.filter((video) => !video.isFavorite);

  async function toggleFavorite(video) {
    if (savingFavorite) return;
    const isFavorite = !video.isFavorite;
    setSavingFavorite(true);
    setFavoriteError('');
    setRows((current) => current.map((row) => row.id === video.id ? { ...row, isFavorite } : row));

    try {
      const response = await fetch(`/api/videos/${video.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: isFavorite }),
      });
      const responseText = await response.text();
      let result = {};
      if (responseText) {
        try {
          result = JSON.parse(responseText);
        } catch {
          throw new Error(response.ok ? 'The server returned an invalid response.' : `Could not update favorite (${response.status}).`);
        }
      }
      if (!response.ok) throw new Error(result.error || 'Could not update favorite.');
      if (!responseText) throw new Error('The server returned an empty response while saving the favorite.');
      setRows((current) => current.map((row) => row.id === video.id ? result : row));
      setSelected((current) => current?.id === video.id ? result : current);
    } catch (error) {
      setRows((current) => current.map((row) => row.id === video.id ? video : row));
      setSelected((current) => current?.id === video.id ? video : current);
      setFavoriteError(error.message);
    } finally {
      setSavingFavorite(false);
    }
  }

  function videoCard(video) {
    const isExpanded = expandedCards.has(video.id);
    const previewId = `video-notes-preview-${video.id}`;
    return (
      <article key={video.id} className={`knowledge-card video-note-card ${isExpanded ? 'is-expanded' : ''}`}>
        <div className="video-note-player">
          <DriveVideo url={video.drive_url} title={video.title} />
          <div className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 text-[11px] text-white/80">
            <LuCirclePlay className="h-3.5 w-3.5 text-info" aria-hidden />Video note
          </div>
        </div>
        <div className="knowledge-card-top video-note-card-top">
          <div className="knowledge-card-heading">
            <button type="button" className="knowledge-card-title" onClick={() => { setSelected(video); setEditing(false); }}>
              {video.title}
            </button>
            <div className="video-note-metadata">
              {video.creator && <span className="video-note-meta-creator"><LuUserRound aria-hidden />{video.creator}</span>}
              {video.topic && <span className="video-note-meta-topic"><LuTag aria-hidden />{video.topic}</span>}
              <span className="video-note-meta-date"><LuCalendarDays aria-hidden />{fmtDate(video.watched_on)}</span>
            </div>
          </div>
          <button
            type="button"
            aria-label={video.isFavorite ? `Remove ${video.title} from favorites` : `Add ${video.title} to favorites`}
            aria-pressed={Boolean(video.isFavorite)}
            title={video.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            disabled={savingFavorite}
            className={`knowledge-card-favorite ${video.isFavorite ? 'is-favorite' : ''}`}
            onClick={() => toggleFavorite(video)}
          >
            <LuStar className="h-4 w-4" fill={video.isFavorite ? 'currentColor' : 'none'} aria-hidden />
          </button>
        </div>
        <div id={previewId} className={`knowledge-card-preview video-note-preview ${isExpanded ? 'is-expanded' : ''}`}>
          {video.notes
            ? <ConceptRichText body={video.notes} />
            : <p className="knowledge-card-empty">No notes added yet.</p>}
        </div>
        <div className="knowledge-card-actions">
          <button type="button" className="knowledge-card-open" onClick={() => { setSelected(video); setEditing(false); }}>
            <LuBookOpen aria-hidden />Open notes
          </button>
          <div className="video-card-actions">
            {video.drive_url && (
              <a href={videoOpen(video.drive_url)} target="_blank" rel="noreferrer" aria-label={`Open ${video.title} source`} title="Open video source">
                <LuExternalLink aria-hidden />
              </a>
            )}
            <button type="button" className="video-card-edit" aria-label={`Edit ${video.title}`} title="Edit video note" onClick={() => { setSelected(video); setEditing(true); }}>
              <LuPencil aria-hidden />
            </button>
            <DeleteButton endpoint={`/api/videos/${video.id}`} />
          </div>
          <button
            type="button"
            className="knowledge-card-expand"
            aria-expanded={isExpanded}
            aria-controls={previewId}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${video.title} notes preview`}
            title={`${isExpanded ? 'Collapse' : 'Expand'} preview`}
            onClick={() => {
              if (isExpanded) document.getElementById(previewId)?.scrollTo({ top: 0 });
              setExpandedCards((current) => {
                const next = new Set(current);
                if (next.has(video.id)) next.delete(video.id);
                else next.add(video.id);
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
    <div className="knowledge-base space-y-6">
      {favoriteError && <p role="alert" className="rounded-lg border border-loss/30 bg-loss/10 px-3 py-2 text-[13px] text-loss">{favoriteError}</p>}
      <div className="knowledge-toolbar">
        <div className="knowledge-search">
          <LuSearch aria-hidden />
          <label className="sr-only" htmlFor="video-notes-search">Search video notes</label>
          <input id="video-notes-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search video notes" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search">×</button>}
        </div>
        <p className="knowledge-total">{visibleRows.length} {visibleRows.length === 1 ? 'video' : 'videos'}</p>
      </div>
      <section aria-labelledby="video-favorites-heading">
        <div className="knowledge-section-heading">
          <LuStar className="h-4 w-4 text-gold" fill="currentColor" aria-hidden />
          <h2 id="video-favorites-heading">Favorites</h2>
          <span className="knowledge-count">{favoriteRows.length}</span>
        </div>
        {favoriteRows.length ? (
          <div className="knowledge-grid">{favoriteRows.map(videoCard)}</div>
        ) : query ? (
          <p className="knowledge-empty">No favorite videos match “{search.trim()}”.</p>
        ) : (
          <p className="knowledge-empty">Favorite a video note to keep it close at hand.</p>
        )}
      </section>

      <section aria-labelledby="video-all-heading">
        <div className="knowledge-section-heading">
          <h2 id="video-all-heading">All videos</h2>
          <span className="knowledge-count">{otherRows.length}</span>
        </div>
        {otherRows.length ? (
          <div className="knowledge-grid">{otherRows.map(videoCard)}</div>
        ) : query ? (
          <p className="knowledge-empty">No other videos match “{search.trim()}”.</p>
        ) : rows.length ? (
          <p className="knowledge-empty">All video notes are in Favorites.</p>
        ) : (
          <p className="knowledge-empty">No video notes yet.</p>
        )}
      </section>

      <Modal
        open={Boolean(selected)}
        onClose={() => { setSelected(null); setEditing(false); }}
        size="max-w-4xl"
        title={editing ? 'Edit video note' : 'Video note'}
      >
        {selected && editing ? (
          <RecordForm
            endpoint={`/api/videos/${selected.id}`}
            fields={fields}
            initial={selected}
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
              <span className="knowledge-detail-icon"><LuCirclePlay className="h-6 w-6 text-info" aria-hidden /></span>
              <div className="min-w-0">
                <p className="knowledge-detail-kicker">READ-ONLY VIDEO NOTES</p>
                <h2>{selected.title}</h2>
                <p className="knowledge-detail-subtitle">{[selected.creator, selected.topic, fmtDate(selected.watched_on)].filter(Boolean).join(' · ')}</p>
              </div>
            </header>
            {selected.drive_url && <div className="video-detail-player"><DriveVideo url={selected.drive_url} title={selected.title} /></div>}
            <article className="knowledge-detail-content">
              <ConceptRichText body={selected.notes} className="knowledge-detail-richtext" />
            </article>
            <div className="knowledge-detail-footer">
              <DeleteButton endpoint={`/api/videos/${selected.id}`} onDone={() => { setSelected(null); setEditing(false); }} />
              <div className="knowledge-detail-actions">
                <button type="button" className="btn" onClick={() => toggleFavorite(selected)}>
                  {selected.isFavorite ? '★ Favorited' : '☆ Add favorite'}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>Edit notes</button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
