'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Panel } from '@/components/ui';
import { driveImage } from '@/lib/drive';
import EconomicNewsCard from '@/components/EconomicNewsCard';
import { useConfirmDialog } from '@/components/ConfirmDialogProvider';
import { LuDownload, LuMaximize2, LuRotateCcw, LuX, LuZoomIn, LuZoomOut } from 'react-icons/lu';
import { driveId } from '@/lib/drive';

function weekLabel() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(new Date());
  const today = new Date(Date.UTC(
    Number(parts.find((part) => part.type === 'year').value),
    Number(parts.find((part) => part.type === 'month').value) - 1,
    Number(parts.find((part) => part.type === 'day').value),
  ));
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const options = { month: 'short', day: 'numeric' };
  return `${monday.toLocaleDateString('en-US', { ...options, timeZone: 'UTC' })} – ${sunday.toLocaleDateString('en-US', { ...options, year: 'numeric', timeZone: 'UTC' })}`;
}

export default function EconomicCalendarCard({ initialUrl = '', initialOpacity = 15, initialNews = [] }) {
  const confirm = useConfirmDialog();
  const [imageUrl, setImageUrl] = useState(initialUrl);
  const [draftUrl, setDraftUrl] = useState(initialUrl);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [overlayOpacity, setOverlayOpacity] = useState(initialOpacity);
  const [newYorkTime, setNewYorkTime] = useState('');
  const imageTriggerRef = useRef(null);
  const closeImageButtonRef = useRef(null);
  const titleId = useId();
  const imageSrc = driveImage(imageUrl, 'w1600') || imageUrl;
  const imageDriveId = driveId(imageUrl);
  const downloadUrl = imageDriveId
    ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(imageDriveId)}`
    : imageSrc;
  const downloadName = `economic-calendar-${weekLabel().replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;

  useEffect(() => {
    if (!imageOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setImageOpen(false);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    closeImageButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
      imageTriggerRef.current?.focus();
    };
  }, [imageOpen]);

  useEffect(() => {
    const updateTime = () => setNewYorkTime(new Date().toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
    }));
    updateTime();
    const timer = window.setInterval(updateTime, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function saveUrl(url) {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/calendar-screenshot', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: url, overlay_opacity: overlayOpacity }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save the calendar link.');
      setImageUrl(data.image_url);
      setDraftUrl(data.image_url);
      setImageFailed(false);
      setMessage(data.image_url ? 'Calendar image saved.' : 'Calendar image removed.');
      window.dispatchEvent(new Event('calendar-updated'));
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveOpacity(value) {
    setOverlayOpacity(value);
    try {
      const response = await fetch('/api/calendar-screenshot', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl, overlay_opacity: value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save overlay opacity.');
      setMessage('Overlay opacity saved.');
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function save(event) {
    event.preventDefault();
    await saveUrl(draftUrl);
  }

  async function downloadImage() {
    setDownloadError('');
    if (imageDriveId) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.click();
      return;
    }

    setDownloadBusy(true);
    try {
      const response = await fetch(downloadUrl, { mode: 'cors' });
      if (!response.ok) throw new Error('The image source rejected the download.');
      const imageBlob = await response.blob();
      const extension = imageBlob.type === 'image/jpeg' ? 'jpg' : imageBlob.type.split('/')[1] || 'png';
      const objectUrl = URL.createObjectURL(imageBlob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${downloadName.replace(/\.png$/, '')}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
    } catch {
      setDownloadError('This image source blocks direct downloads. Open the image to save it.');
    } finally {
      setDownloadBusy(false);
    }
  }

  return (
    <Panel title="This week’s economic calendar" icon="🗓" action={<span className="text-right text-[12px] text-muted">{weekLabel()} · {newYorkTime || '—'} New York time</span>}>
      <div className="mb-4">
        <EconomicNewsCard initialNews={initialNews} />
      </div>
      <div className="mb-4 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Calendar source</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <form onSubmit={save} className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor={titleId}>Calendar screenshot link</label>
        <input
          id={titleId}
          type="url"
          className="field min-w-0 flex-1"
          placeholder="Paste a Google Drive or direct image link"
          value={draftUrl}
          onChange={(event) => setDraftUrl(event.target.value)}
          aria-describedby={`${titleId}-help`}
        />
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save link'}
        </button>
        {imageUrl && (
          <button
            type="button"
            className="btn"
            disabled={saving}
            onClick={async () => {
              const accepted = await confirm({
                title: 'Remove calendar image?',
                message: 'The saved economic calendar image will be cleared.',
                confirmLabel: 'Remove image',
              });
              if (!accepted) return;
              setDraftUrl('');
              await saveUrl('');
            }}
          >
            Remove
          </button>
        )}
        {imageUrl && (
          <label className="flex min-w-[150px] items-center gap-2 rounded-lg border border-line bg-panel2 px-3 py-2 text-[11px] text-muted" title="Calendar image overlay opacity">
            <span className="shrink-0">Overlay</span>
            <input
              type="range"
              min="0"
              max="60"
              step="5"
              value={overlayOpacity}
              onChange={(event) => saveOpacity(Number(event.target.value))}
              className="w-full accent-win"
              aria-label="Calendar image overlay opacity"
            />
            <span className="w-8 shrink-0 text-right font-mono text-[10px]">{overlayOpacity}%</span>
          </label>
        )}
      </form>
      <p id={`${titleId}-help`} className="mt-2 text-[12px] text-muted">
        Paste a publicly viewable Google Drive share link or a direct image URL. The saved image stays here for the next visit.
      </p>
      {error && <p role="alert" className="mt-3 text-[13px] text-loss">{error}</p>}
      {message && <p role="status" className="mt-3 text-[12px] text-win">{message}</p>}

      {imageUrl ? (
        <div className="relative mt-4 overflow-hidden rounded-lg border border-line bg-ink">
          {imageFailed ? (
            <div className="p-6 text-center text-[13px] text-muted">
              Couldn’t load the image. Check the link and sharing permissions, then save it again.
            </div>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <button
                ref={imageTriggerRef}
                type="button"
                className="group relative block w-full cursor-zoom-in border-0 bg-ink p-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-win"
                onClick={() => { setImageZoom(1); setImageOpen(true); }}
                aria-label="View economic calendar image full size"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={imageSrc}
                  src={imageSrc}
                  alt={`Economic calendar for the week of ${weekLabel()}`}
                  className="max-h-[680px] w-full object-contain"
                  onError={() => setImageFailed(true)}
                />
                <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: overlayOpacity / 100 }} aria-hidden="true" />
                <span className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/25 bg-black/75 text-white" aria-hidden="true">
                  <LuMaximize2 className="h-5 w-5" />
                </span>
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="mt-4 flex min-h-36 items-center justify-center rounded-lg border border-dashed border-line bg-ink px-4 text-center text-[13px] text-muted">
          Add this week’s calendar screenshot to see it here.
        </div>
      )}
      {imageOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black p-3 sm:p-6"
          onClick={(event) => { if (event.target === event.currentTarget) setImageOpen(false); }}
        >
          <div role="dialog" aria-modal="true" aria-label="Economic calendar image" className="flex h-[calc(100dvh-1.5rem)] max-h-[calc(100dvh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-line bg-black sm:h-[calc(100dvh-3rem)] sm:max-h-[calc(100dvh-3rem)]">
            <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2 sm:flex-nowrap sm:px-4">
              <span className="min-w-0 flex-1 basis-full truncate text-[13px] font-medium text-text sm:basis-auto">Economic calendar · {weekLabel()}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line text-text hover:bg-panel2 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => setImageZoom((current) => Math.max(0.5, +(current - 0.25).toFixed(2)))}
                  disabled={imageZoom <= 0.5}
                  aria-label="Zoom out"
                  title="Zoom out"
                >
                  <LuZoomOut className="h-5 w-5" aria-hidden="true" />
                </button>
                <span className="w-12 text-center font-mono text-[11px] tabular-nums text-muted">{Math.round(imageZoom * 100)}%</span>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line text-text hover:bg-panel2 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => setImageZoom((current) => Math.min(3, +(current + 0.25).toFixed(2)))}
                  disabled={imageZoom >= 3}
                  aria-label="Zoom in"
                  title="Zoom in"
                >
                  <LuZoomIn className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line text-text hover:bg-panel2"
                  onClick={() => setImageZoom(1)}
                  aria-label="Reset zoom"
                  title="Reset zoom"
                >
                  <LuRotateCcw className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={downloadImage}
                  disabled={downloadBusy}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line px-3 text-[12px] font-medium text-text hover:bg-panel2 disabled:opacity-50"
                  aria-label="Download calendar image"
                  title="Download calendar image"
                >
                  <LuDownload className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{downloadBusy ? 'Downloading' : 'Download'}</span>
                </button>
              </div>
              <button
                ref={closeImageButtonRef}
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line text-text hover:bg-panel2"
                onClick={() => setImageOpen(false)}
                aria-label="Close calendar image"
              >
                <LuX className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>
            {downloadError && (
              <p role="alert" className="shrink-0 border-b border-loss/30 bg-loss/10 px-4 py-2 text-[12px] text-loss">
                {downloadError}{' '}
                <a href={imageSrc} target="_blank" rel="noreferrer" className="underline">Open image</a>
              </p>
            )}
            <div className="min-h-0 flex-1 overflow-auto bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt={`Economic calendar for the week of ${weekLabel()}`}
                className="mx-auto block h-auto"
                style={{ width: `${imageZoom * 100}%`, maxWidth: 'none' }}
              />
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
