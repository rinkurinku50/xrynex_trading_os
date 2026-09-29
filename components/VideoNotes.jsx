'use client';

import { useEffect, useState } from 'react';
import { DeleteButton, Modal, RecordForm } from '@/components/Form';
import { DriveVideo } from '@/components/DriveMedia';
import { fmtDate } from '@/components/ui';
import { videoOpen } from '@/lib/drive';
import { LuCalendarDays, LuCirclePlay, LuExternalLink, LuPencil, LuStar, LuTag, LuUserRound } from 'react-icons/lu';

const fields = [
  { name: 'title', label: 'Title', type: 'text', required: true },
  { name: 'creator', label: 'Creator', type: 'text' },
  { name: 'topic', label: 'Topic', type: 'text' },
  { name: 'watched_on', label: 'Watched on', type: 'date' },
  { name: 'drive_url', label: 'Video link', type: 'text' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export default function VideoNotes({ videos }) {
  const [rows, setRows] = useState(videos);
  const [selected, setSelected] = useState(null);
  const [favoriteError, setFavoriteError] = useState('');
  const [savingFavorite, setSavingFavorite] = useState(false);

  useEffect(() => setRows(videos), [videos]);

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
    } catch (error) {
      setRows((current) => current.map((row) => row.id === video.id ? video : row));
      setFavoriteError(error.message);
    } finally {
      setSavingFavorite(false);
    }
  }

  function videoCard(video) {
    return (
      <article key={video.id} className="group overflow-hidden rounded-xl border border-line bg-panel2/40 transition-colors hover:border-info/40 hover:bg-panel2/70">
        <div className="relative bg-black">
          <DriveVideo url={video.drive_url} title={video.title} />
          <div className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 text-[11px] text-white/80">
            <LuCirclePlay className="h-3.5 w-3.5 text-info" aria-hidden />
            Video note
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[15px] font-semibold leading-snug text-text">{video.title}</h3>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label={video.isFavorite ? `Remove ${video.title} from favorites` : `Add ${video.title} to favorites`}
                aria-pressed={Boolean(video.isFavorite)}
                title={video.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                disabled={savingFavorite}
                className={`rounded-md p-1.5 transition hover:bg-ink disabled:cursor-wait disabled:opacity-50 ${video.isFavorite ? 'text-gold' : 'text-muted hover:text-gold'}`}
                onClick={() => toggleFavorite(video)}
              >
                <LuStar className="h-4 w-4" fill={video.isFavorite ? 'currentColor' : 'none'} aria-hidden />
              </button>
              {video.drive_url && (
                <a href={videoOpen(video.drive_url)} target="_blank" rel="noreferrer" title="Open video source" className="rounded-md p-1.5 text-muted hover:bg-ink hover:text-info">
                  <LuExternalLink className="h-4 w-4" aria-hidden />
                </a>
              )}
              <button type="button" title="Edit video note" className="rounded-md p-1.5 text-muted hover:bg-ink hover:text-info" onClick={() => setSelected(video)}>
                <LuPencil className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted">
            {video.creator && <span className="inline-flex items-center gap-1 rounded-md border border-line bg-ink px-2 py-1"><LuUserRound className="h-3.5 w-3.5 text-info" aria-hidden />{video.creator}</span>}
            {video.topic && <span className="inline-flex items-center gap-1 rounded-md border border-line bg-ink px-2 py-1"><LuTag className="h-3.5 w-3.5 text-gold" aria-hidden />{video.topic}</span>}
            <span className="inline-flex items-center gap-1 rounded-md border border-line bg-ink px-2 py-1"><LuCalendarDays className="h-3.5 w-3.5 text-win" aria-hidden />{fmtDate(video.watched_on)}</span>
          </div>
          {video.notes && <div className="mt-4 border-l-2 border-info/50 pl-3"><div className="label">Notes</div><p className="mt-1 line-clamp-4 whitespace-pre-line text-[13px] leading-relaxed text-text/85">{video.notes}</p></div>}
          <div className="mt-4 flex justify-end border-t border-line pt-3">
            <DeleteButton endpoint={`/api/videos/${video.id}`} />
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="space-y-6">
      {favoriteError && <p role="alert" className="rounded-lg border border-loss/30 bg-loss/10 px-3 py-2 text-[13px] text-loss">{favoriteError}</p>}
      <section aria-labelledby="video-favorites-heading">
        <div className="mb-3 flex items-center gap-2">
          <LuStar className="h-4 w-4 text-gold" fill="currentColor" aria-hidden />
          <h2 id="video-favorites-heading" className="text-[15px] font-semibold text-text">Favorites</h2>
        </div>
        {rows.some((video) => video.isFavorite) ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.filter((video) => video.isFavorite).map(videoCard)}</div>
        ) : (
          <p className="rounded-lg border border-dashed border-line px-4 py-3 text-[12px] text-muted">Favorite a video with the star to keep it here.</p>
        )}
      </section>

      <section aria-labelledby="video-all-heading" className="border-t border-line pt-6">
        <h2 id="video-all-heading" className="mb-3 text-[15px] font-semibold text-text">All videos</h2>
        {rows.some((video) => !video.isFavorite) ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.filter((video) => !video.isFavorite).map(videoCard)}</div>
        ) : (
          <p className="rounded-lg border border-dashed border-line px-4 py-3 text-[12px] text-muted">All video notes are in Favorites.</p>
        )}
      </section>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Edit video note">
        {selected && (
          <RecordForm
            endpoint={`/api/videos/${selected.id}`}
            fields={fields}
            initial={selected}
            method="PATCH"
            submitLabel="Save changes"
            onDone={() => setSelected(null)}
          />
        )}
      </Modal>
    </div>
  );
}
