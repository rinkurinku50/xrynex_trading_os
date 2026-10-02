'use client';

import { useEffect, useState } from 'react';
import { LuCopy, LuGripVertical, LuPencil, LuPlus, LuSave, LuTrash2, LuX } from 'react-icons/lu';
import SelectMenu from '@/components/SelectMenu';
import { useConfirmDialog } from '@/components/ConfirmDialogProvider';
import { readPreferences, writePreferences } from '@/lib/client-preferences';

const priorities = ['High', 'Medium', 'Low', 'Bank holiday'];
const priorityRank = { High: 0, Medium: 1, Low: 2, 'Bank holiday': 3 };
const priorityStyles = {
  High: 'bg-loss',
  Medium: 'bg-[#f08b3e]',
  Low: 'bg-gold',
  'Bank holiday': 'bg-[#94a3b2]',
};
const priorityBadgeStyles = {
  High: 'border-loss/30 bg-loss/10 text-loss',
  Medium: 'border-gold/30 bg-gold/10 text-gold',
  Low: 'border-line bg-panel2 text-muted',
  'Bank holiday': 'border-line bg-panel2 text-muted',
};
const priorityIcons = priorityStyles;
function newYorkInputValue() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date()).replace(' ', 'T');
}

function newYorkCurrentDateTime(date) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(date).replace(' ', 'T');
}

function formatNewYorkTime(value) {
  if (!value) return 'No date set';
  return `${new Date(`${value}:00Z`).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' })} NY`;
}

function formatNewYorkDate(value) {
  if (!value) return 'No date set';
  return new Date(`${value}:00Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function formatEventClockTime(value) {
  if (!value) return '';
  return new Date(`${value}:00Z`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });
}

function formatZoneTime(timestamp, timeZone) {
  if (!timestamp) return '—';
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date(timestamp));
}

function formatCountdown(value, now) {
  if (!value || !now) return '';
  const secondsLeft = Math.floor((new Date(`${value}:00Z`).getTime() - new Date(`${now}Z`).getTime()) / 1000);
  if (!Number.isFinite(secondsLeft) || secondsLeft <= 0) return '';
  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  return [hours, minutes, seconds].map((unit) => String(unit).padStart(2, '0')).join(':');
}

function eventValue(item) {
  return item.event_at ?? item.eventAt ?? '';
}

async function readResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: `The server returned an invalid response (${response.status}).` };
  }
}

export default function EconomicNewsCard({ initialNews = [], compact = false }) {
  const confirm = useConfirmDialog();
  const [news, setNews] = useState(initialNews);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [eventAt, setEventAt] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ title: '', priority: 'Medium', eventAt: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [nowNY, setNowNY] = useState('');
  const [clockNow, setClockNow] = useState(0);

  useEffect(() => {
    if (!compact && !eventAt) setEventAt(newYorkInputValue());
  }, [compact, eventAt]);

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      setClockNow(now.getTime());
      setNowNY(newYorkCurrentDateTime(now));
    };
    updateClocks();
    const interval = window.setInterval(updateClocks, 1_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let mounted = true;
    readPreferences(['economic-news-order'], {
      'economic-news-order': 'xrynex-economic-news-order',
    }).then((saved) => {
      if (!mounted || !Array.isArray(saved['economic-news-order']) || !saved['economic-news-order'].length) return;
      const savedOrder = saved['economic-news-order'];
      setNews((current) => [...current].sort((a, b) => {
        const aIndex = savedOrder.indexOf(a.id);
        const bIndex = savedOrder.indexOf(b.id);
        return (aIndex < 0 ? savedOrder.length : aIndex) - (bIndex < 0 ? savedOrder.length : bIndex);
      }));
    }).catch((loadError) => {
      if (mounted) setError(loadError.message);
    });
    return () => { mounted = false; };
  }, []);

  const dashboardNews = compact && nowNY
    ? news.filter((item) => {
      const event = eventValue(item);
      return !event || event.slice(0, 10) >= nowNY.slice(0, 10);
    })
    : news;

  const newsToDisplay = compact ? dashboardNews : news;
  const visibleNews = [...newsToDisplay].sort((left, right) => {
      const leftEvent = eventValue(left);
      const rightEvent = eventValue(right);
      const leftCompleted = Boolean(leftEvent && nowNY && leftEvent <= nowNY);
      const rightCompleted = Boolean(rightEvent && nowNY && rightEvent <= nowNY);
      if (leftCompleted !== rightCompleted) return leftCompleted ? 1 : -1;

      const priorityDifference = (priorityRank[left.priority] ?? 99) - (priorityRank[right.priority] ?? 99);
      if (priorityDifference) return priorityDifference;
      if (!leftEvent) return rightEvent ? 1 : 0;
      if (!rightEvent) return -1;
      return rightEvent.localeCompare(leftEvent);
    });

  async function addNews(event) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/economic-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority, event_at: eventAt }),
      });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.error || 'Could not add news.');
      setNews((current) => [result, ...current]);
      setTitle('');
      setPriority('Medium');
      setEventAt('');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeNews(item) {
    const accepted = await confirm({
      title: 'Remove economic news?',
      message: `“${item.title}” will be permanently removed.`,
      confirmLabel: 'Remove news',
    });
    if (!accepted) return;
    try {
      const response = await fetch(`/api/economic-news/${item.id}`, { method: 'DELETE' });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.error || 'Could not remove news.');
      setNews((current) => current.filter((currentItem) => currentItem.id !== item.id));
    } catch (removeError) {
      setError(removeError.message);
    }
  }

  async function duplicateNews(item) {
    setDuplicatingId(item.id);
    setError('');
    try {
      const response = await fetch('/api/economic-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          priority: item.priority,
          event_at: eventValue(item),
        }),
      });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.error || 'Could not duplicate this news item.');
      setNews((current) => [result, ...current]);
    } catch (duplicateError) {
      setError(duplicateError.message);
    } finally {
      setDuplicatingId(null);
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditValues({ title: item.title, priority: item.priority, eventAt: eventValue(item) });
  }

  async function saveEdit(event) {
    event.preventDefault();
    const response = await fetch(`/api/economic-news/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editValues.title, priority: editValues.priority, event_at: editValues.eventAt }),
    });
    const result = await readResponse(response);
    if (!response.ok) {
      setError(result.error || 'Could not update news.');
      return;
    }
    setNews((current) => current.map((item) => item.id === editingId ? result : item));
    setEditingId(null);
    setError('');
  }

  async function moveNews(targetId, sourceId = draggedId) {
    if (compact || !sourceId || sourceId === targetId) return;
    const fromIndex = news.findIndex((item) => item.id === sourceId);
    const toIndex = news.findIndex((item) => item.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...news];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setNews(next);
    setDraggedId(null);
    setDropTarget(null);
    writePreferences({ 'economic-news-order': next.map((item) => item.id) })
      .catch((saveError) => setError(saveError.message));
  }

  return (
    <section className="panel">
      <header className="panel-head">
        <h2 className="panel-title"><span aria-hidden>📰</span> Economic news</h2>
        {!compact && <span className="text-[12px] text-muted">Manual events</span>}
      </header>
      {compact && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line bg-panel2/20 px-4 py-2 text-[11px]">
          <span className="font-semibold uppercase tracking-wide text-muted">Live clocks</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="text-muted">India</span>
            <span className="font-mono font-medium tabular-nums text-text">{formatZoneTime(clockNow, 'Asia/Kolkata')}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="text-muted">NY</span>
            <span className="font-mono font-medium tabular-nums text-text">{formatZoneTime(clockNow, 'America/New_York')}</span>
          </span>
        </div>
      )}
      <div className="panel-body">
        {!compact && (
          <form onSubmit={addNews} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,190px)_150px_auto]">
            <input className="field min-w-0 flex-1" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="News name" aria-label="News name" maxLength={160} />
            <label className="relative">
              <span className="sr-only">News date and time in New York time</span>
              <input className="field" type="datetime-local" value={eventAt} onChange={(event) => setEventAt(event.target.value)} aria-label="News date and time in New York time" required />
            </label>
            <SelectMenu value={priority} options={priorities} optionIcons={priorityIcons} onChange={setPriority} label="News priority" className="w-full sm:w-[150px]" />
            <button type="submit" className="btn btn-primary shrink-0" disabled={saving}><LuPlus className="h-4 w-4" aria-hidden />Add news</button>
          </form>
        )}
        {error && <p role="alert" className="mt-3 text-[12px] text-loss">{error}</p>}
        <ul className={`${compact ? '' : 'mt-4'} divide-y divide-line`}>
          {visibleNews.map((item) => {
            const itemEventAt = eventValue(item);
            const isTodayEvent = compact && nowNY && itemEventAt.slice(0, 10) === nowNY.slice(0, 10);
            const isUpcoming = nowNY && itemEventAt && itemEventAt > nowNY && (!compact || itemEventAt.slice(0, 10) > nowNY.slice(0, 10));
            const isCompleted = nowNY && itemEventAt && itemEventAt <= nowNY;

            return (
            <li
              key={item.id}
              draggable={!compact && editingId !== item.id}
              onDragStart={(event) => {
                if (compact || editingId === item.id) return;
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', String(item.id));
                setDraggedId(item.id);
              }}
              onDragEnter={() => !compact && setDropTarget(item.id)}
              onDragOver={(event) => { if (!compact) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; } }}
              onDrop={(event) => { event.preventDefault(); moveNews(item.id, Number(event.dataTransfer.getData('text/plain')) || draggedId); }}
              onDragEnd={() => { setDraggedId(null); setDropTarget(null); }}
              className={`py-2.5 ${draggedId === item.id ? 'opacity-50' : dropTarget === item.id ? 'rounded-lg bg-info/5' : ''}`}
            >
              {editingId === item.id ? (
                <form onSubmit={saveEdit} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,190px)_150px_auto_auto]">
                  <input className="field" value={editValues.title} onChange={(event) => setEditValues((current) => ({ ...current, title: event.target.value }))} aria-label="Edit news name" />
                  <input className="field" type="datetime-local" value={editValues.eventAt} onChange={(event) => setEditValues((current) => ({ ...current, eventAt: event.target.value }))} aria-label="Edit New York news date and time" required />
                  <SelectMenu value={editValues.priority} options={priorities} optionIcons={priorityIcons} onChange={(value) => setEditValues((current) => ({ ...current, priority: value }))} label="Edit news priority" className="w-full sm:w-[150px]" />
                  <button type="submit" className="btn btn-primary"><LuSave className="h-4 w-4" aria-hidden />Save</button>
                  <button type="button" className="btn" onClick={() => setEditingId(null)} aria-label="Cancel edit"><LuX className="h-4 w-4" aria-hidden /></button>
                </form>
              ) : (
                <div className="flex items-center gap-3">
                  {!compact && <LuGripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted/60 active:cursor-grabbing" aria-label="Drag to reorder news" />}
                  <span className={`h-3 w-3 shrink-0 rounded-sm ${priorityStyles[item.priority] || 'bg-muted'}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium text-text">{item.title}</div>
                    <div className="text-[11px] text-muted">{compact ? formatNewYorkDate(itemEventAt) : formatNewYorkTime(itemEventAt)}</div>
                  </div>
                  <span className={`shrink-0 whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${priorityBadgeStyles[item.priority] || 'border-line bg-panel2 text-muted'}`}>
                    {item.priority}
                  </span>
                  {itemEventAt && <span className="mx-1 h-6 w-[2px] shrink-0 rounded-full bg-muted opacity-80" aria-hidden="true" />}
                  {itemEventAt && (
                    <span
                      className="shrink-0 whitespace-nowrap text-[11px] font-medium text-text"
                      aria-label={`Scheduled news time: ${formatEventClockTime(itemEventAt)}`}
                    >
                      {formatEventClockTime(itemEventAt)}
                    </span>
                  )}
                  {itemEventAt && (isTodayEvent || isUpcoming || isCompleted) && <span className="mx-1 h-6 w-[2px] shrink-0 rounded-full bg-muted opacity-80" aria-hidden="true" />}
                  {isUpcoming && (
                    <span className="shrink-0 whitespace-nowrap rounded-md border border-info/30 bg-info/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-info">
                      Upcoming
                    </span>
                  )}
                  {isTodayEvent && !isCompleted && (
                    <span
                      className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-info"
                      aria-label={`Time until ${item.title}: ${formatCountdown(itemEventAt, nowNY)}`}
                      title="Time until event"
                    >
                      {formatCountdown(itemEventAt, nowNY)}
                    </span>
                  )}
                  {isCompleted && (
                    <span className="shrink-0 whitespace-nowrap rounded-full border border-win/30 bg-win/10 px-2 py-1 text-[10px] font-semibold text-win">
                      {compact ? 'News completed' : 'Completed'}
                    </span>
                  )}
                  {!compact && <>
                    <button type="button" className="rounded p-1 text-muted hover:bg-panel2 hover:text-info" onClick={() => startEdit(item)} aria-label={`Edit ${item.title}`}><LuPencil className="h-3.5 w-3.5" aria-hidden /></button>
                    <button type="button" className="rounded p-1 text-muted hover:bg-panel2 hover:text-info disabled:opacity-50" onClick={() => duplicateNews(item)} disabled={duplicatingId === item.id} aria-label={`Duplicate ${item.title}`} title="Duplicate news"><LuCopy className="h-3.5 w-3.5" aria-hidden /></button>
                    <button type="button" className="rounded p-1 text-muted hover:bg-panel2 hover:text-loss" onClick={() => removeNews(item)} aria-label={`Remove ${item.title}`}><LuTrash2 className="h-3.5 w-3.5" aria-hidden /></button>
                  </>}
                </div>
              )}
            </li>
            );
          })}
          {!visibleNews.length && (
            <li className="py-2 text-[12px] text-muted">
              {compact && news.length ? 'No current or upcoming news.' : 'No manual news added yet.'}
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}
