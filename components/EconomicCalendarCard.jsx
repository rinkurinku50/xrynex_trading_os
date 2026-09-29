'use client';

import { useEffect, useId, useState } from 'react';
import { Panel } from '@/components/ui';
import { driveImage } from '@/lib/drive';
import EconomicNewsCard from '@/components/EconomicNewsCard';
import { useConfirmDialog } from '@/components/ConfirmDialogProvider';

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
  const [overlayOpacity, setOverlayOpacity] = useState(initialOpacity);
  const [newYorkTime, setNewYorkTime] = useState('');
  const titleId = useId();
  const imageSrc = driveImage(imageUrl, 'w1600') || imageUrl;

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
              <img
                key={imageSrc}
                src={imageSrc}
                alt={`Economic calendar for the week of ${weekLabel()}`}
                className="max-h-[680px] w-full object-contain"
                onError={() => setImageFailed(true)}
              />
              <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: overlayOpacity / 100 }} aria-hidden="true" />
            </>
          )}
        </div>
      ) : (
        <div className="mt-4 flex min-h-36 items-center justify-center rounded-lg border border-dashed border-line bg-ink px-4 text-center text-[13px] text-muted">
          Add this week’s calendar screenshot to see it here.
        </div>
      )}
    </Panel>
  );
}
