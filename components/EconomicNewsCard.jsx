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

function formatEventDateHeading(value) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function formatEventClockTime(value) {
  if (!value || value.length === 10) return '';
  return eventDate(value).toLocaleTimeString('en-US', {
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

function formatZoneDate(timestamp, timeZone) {
  if (!timestamp) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.weekday} ${values.day} ${values.month}`;
}

function formatCountdown(value, now) {
  if (!value || !now || value.length === 10) return '';
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

function eventDate(value) {
  return new Date(value.length === 10 ? `${value}T00:00:00Z` : `${value}:00Z`);
}

function eventCompleted(value, now) {
  if (!value || !now) return false;
  return value.length === 10 ? value < now.slice(0, 10) : value <= now;
}

function eventUpcoming(value, now) {
  if (!value || !now) return false;
  return value.length === 10 ? value > now.slice(0, 10) : value > now;
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

export default function EconomicNewsCard({ initialNews = [], compact = false, sectionTitle = 'Economic news' }) {
  const confirm = useConfirmDialog();
  const [news, setNews] = useState(initialNews);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [eventAt, setEventAt] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ title: '', priority: 'Medium', eventAt: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingDate, setDeletingDate] = useState(null);
  const [editingDate, setEditingDate] = useState(null);
  const [editDateValue, setEditDateValue] = useState('');
  const [savingDate, setSavingDate] = useState(false);
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

  useEffect(() => {
    const addCreatedEvents = (event) => {
      const createdEvents = event.detail?.events;
      if (!Array.isArray(createdEvents) || !createdEvents.length) return;
      setNews((current) => {
        const ids = new Set(current.map((item) => item.id));
        return [...createdEvents.filter((item) => !ids.has(item.id)), ...current];
      });
    };
    const replaceEvents = (event) => {
      if (!Array.isArray(event.detail?.events)) return;
      setNews(event.detail.events);
      setEditingId(null);
    };
    window.addEventListener('economic-news-created', addCreatedEvents);
    window.addEventListener('economic-news-replaced', replaceEvents);
    return () => {
      window.removeEventListener('economic-news-created', addCreatedEvents);
      window.removeEventListener('economic-news-replaced', replaceEvents);
    };
  }, []);

  const dashboardNews = compact && nowNY
    ? news.filter((item) => {
      const event = eventValue(item);
      return !event || event.slice(0, 10) >= nowNY.slice(0, 10);
    })
    : news;

  const newsToDisplay = compact ? dashboardNews : news;
  const visibleNews = [...newsToDisplay]
    .filter((item) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(eventValue(item)))
    .sort((left, right) => {
      const leftEvent = eventValue(left);
      const rightEvent = eventValue(right);
      const leftCompleted = eventCompleted(leftEvent, nowNY);
      const rightCompleted = eventCompleted(rightEvent, nowNY);
      if (leftCompleted !== rightCompleted) return leftCompleted ? 1 : -1;

      const priorityDifference = (priorityRank[left.priority] ?? 99) - (priorityRank[right.priority] ?? 99);
      if (priorityDifference) return priorityDifference;
      if (!leftEvent) return rightEvent ? 1 : 0;
      if (!rightEvent) return -1;
      return rightEvent.localeCompare(leftEvent);
    });
  const eventsByDate = new Map();
  for (const item of visibleNews) {
    const eventAt = eventValue(item);
    const date = eventAt.slice(0, 10);
    const time = eventAt.slice(11, 16);
    if (!eventsByDate.has(date)) eventsByDate.set(date, new Map());
    const eventsByTime = eventsByDate.get(date);
    if (!eventsByTime.has(time)) eventsByTime.set(time, []);
    eventsByTime.get(time).push(item);
  }
  const groupedNews = [...eventsByDate.entries()]
    .map(([date, eventsByTime]) => ({
      date,
      times: [...eventsByTime.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([time, events]) => ({ time, events })),
    }))
    .sort((left, right) => {
      const today = nowNY?.slice(0, 10) ?? '';
      const leftPast = today && left.date < today;
      const rightPast = today && right.date < today;
      if (leftPast !== rightPast) return leftPast ? 1 : -1;
      return left.date.localeCompare(right.date);
    });

  async function addNews(event) {
    event.preventDefault();
    if (!title.trim()) {
      setError('Enter a news name.');
      return;
    }
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

  async function removeDateNews(date, items) {
    setDeletingDate(date);
    setError('');
    try {
      const dateLabel = formatEventDateHeading(date);
      const accepted = await confirm({
        title: `Remove all news for ${dateLabel}?`,
        message: `${items.length} scheduled news ${items.length === 1 ? 'event' : 'events'} for this date will be permanently removed.`,
        confirmLabel: 'Remove all',
      });
      if (!accepted) return;

      const results = await Promise.all(items.map(async (item) => {
        const response = await fetch(`/api/economic-news/${item.id}`, { method: 'DELETE' });
        const result = await readResponse(response);
        return { id: item.id, ok: response.ok, error: result.error };
      }));
      const deletedIds = new Set(results.filter((result) => result.ok).map((result) => result.id));
      if (deletedIds.size) setNews((current) => current.filter((item) => !deletedIds.has(item.id)));
      const failures = results.filter((result) => !result.ok);
      if (failures.length) setError(`${failures.length} event${failures.length === 1 ? '' : 's'} could not be removed.`);
    } catch (deleteError) {
      setError(deleteError.message || 'Could not remove this date group.');
    } finally {
      setDeletingDate(null);
    }
  }

  async function saveDateEdit(event, items) {
    event.preventDefault();
    if (!editDateValue) return;
    setSavingDate(true);
    setError('');
    try {
      const response = await fetch('/api/economic-news', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: editDateValue, ids: items.map((item) => item.id) }),
      });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.error || 'Could not update this date group.');
      const updatedById = new Map(result.map((item) => [item.id, item]));
      setNews((current) => current.map((item) => updatedById.get(item.id) ?? item));
      setEditingDate(null);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSavingDate(false);
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
        <h2 className="panel-title"><span aria-hidden>📰</span> {sectionTitle}</h2>
        {!compact && <span className="text-[12px] text-muted">Manual events</span>}
      </header>
      {compact && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line bg-panel2/20 px-4 py-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
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
          <time className="ml-auto whitespace-nowrap font-mono tabular-nums text-muted">
            {formatZoneDate(clockNow, 'America/New_York')}
          </time>
        </div>
      )}
      <div className="panel-body">
        {!compact && (
          <form onSubmit={addNews} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,190px)_150px_auto]">
            <input className="field min-w-0 flex-1" value={title} onChange={(event) => { setTitle(event.target.value); if (event.target.value.trim()) setError(''); }} placeholder="News name" aria-label="News name" maxLength={160} required />
            <label className="relative">
              <span className="sr-only">News date and time in New York time</span>
              <input className="field" type="datetime-local" value={eventAt} onChange={(event) => setEventAt(event.target.value)} aria-label="News date and time in New York time" required />
            </label>
            <SelectMenu value={priority} options={priorities} optionIcons={priorityIcons} onChange={setPriority} label="News priority" className="w-full sm:w-[150px]" />
            <button type="submit" className="btn btn-primary shrink-0" disabled={saving}><LuPlus className="h-4 w-4" aria-hidden />Add news</button>
          </form>
        )}
        {error && <p role="alert" className="mt-3 text-[12px] text-loss">{error}</p>}
        <div className={`${compact ? '' : 'mt-4'} divide-y divide-line`}>
          {groupedNews.map(({ date, times }) => {
            const dateLabel = formatEventDateHeading(date);
            const dateEvents = times.flatMap((timeGroup) => timeGroup.events);
            return (
            <section key={date} className="py-3 first:pt-0">
              <div className="mb-2 flex items-center justify-between gap-2">
                {editingDate === date ? (
                  <form onSubmit={(event) => saveDateEdit(event, dateEvents)} className="flex min-w-0 items-center gap-2">
                    <label className="sr-only" htmlFor={`event-date-${date}`}>Move all events from {dateLabel} to another date</label>
                    <input id={`event-date-${date}`} className="field w-auto" type="date" value={editDateValue} onChange={(event) => setEditDateValue(event.target.value)} required />
                    <button type="submit" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-win hover:bg-panel2 disabled:opacity-50" disabled={savingDate} aria-label={`Save new date for ${dateLabel}`} title="Save new date">
                      <LuSave className="h-4 w-4" aria-hidden />
                    </button>
                    <button type="button" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted hover:bg-panel2 disabled:opacity-50" disabled={savingDate} onClick={() => setEditingDate(null)} aria-label={`Cancel date edit for ${dateLabel}`} title="Cancel">
                      <LuX className="h-4 w-4" aria-hidden />
                    </button>
                  </form>
                ) : <h3 className="text-[13px] font-semibold text-text">{dateLabel}</h3>}
                {!compact && (
                  <div className="flex shrink-0 items-center gap-1">
                    {editingDate !== date && (
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded text-muted hover:bg-panel2 hover:text-info disabled:opacity-50"
                        onClick={() => { setEditingDate(date); setEditDateValue(date); }}
                        disabled={Boolean(deletingDate || savingDate)}
                        aria-label={`Edit date for ${dateLabel}`}
                        title={`Edit date for ${dateLabel}`}
                      >
                        <LuPencil className="h-4 w-4" aria-hidden />
                      </button>
                    )}
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded text-muted hover:bg-panel2 hover:text-loss disabled:opacity-50"
                      onClick={() => removeDateNews(date, dateEvents)}
                      disabled={Boolean(deletingDate || savingDate)}
                      aria-label={`Remove all ${dateEvents.length} news events for ${dateLabel}`}
                      title={`Remove all news for ${dateLabel}`}
                    >
                      <LuTrash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                )}
              </div>
              <div className="ml-1 border-l border-line pl-3">
                {times.map(({ time, events }) => {
                  const slotAt = `${date}T${time}`;
                  const slotCountdown = compact && date === nowNY.slice(0, 10) ? formatCountdown(slotAt, nowNY) : '';
                  return (
                    <section key={time} className="py-2 first:pt-0">
                      <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h4 className="text-[12px] font-semibold text-text">{formatEventClockTime(slotAt)}</h4>
                        {slotCountdown && (
                          <span className="font-mono text-[11px] font-semibold tabular-nums text-info" aria-label={`Time until ${events.length} scheduled events`} title="Time until events">
                            {slotCountdown}
                          </span>
                        )}
                      </div>
                      <ul className="divide-y divide-line/60">
                        {events.map((item) => {
                          const itemEventAt = eventValue(item);
                          const isTodayEvent = compact && nowNY && itemEventAt.slice(0, 10) === nowNY.slice(0, 10);
                          const isUpcoming = eventUpcoming(itemEventAt, nowNY) && (!compact || itemEventAt.slice(0, 10) > nowNY.slice(0, 10));
                          const isCompleted = eventCompleted(itemEventAt, nowNY);

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
                                  <input className="field" type={editValues.eventAt.length === 10 ? 'date' : 'datetime-local'} value={editValues.eventAt} onChange={(event) => setEditValues((current) => ({ ...current, eventAt: event.target.value }))} aria-label={editValues.eventAt.length === 10 ? 'Edit all-day news date' : 'Edit New York news date and time'} required />
                                  <SelectMenu value={editValues.priority} options={priorities} optionIcons={priorityIcons} onChange={(value) => setEditValues((current) => ({ ...current, priority: value }))} label="Edit news priority" className="w-full sm:w-[150px]" />
                                  <button type="submit" className="btn btn-primary"><LuSave className="h-4 w-4" aria-hidden />Save</button>
                                  <button type="button" className="btn" onClick={() => setEditingId(null)} aria-label="Cancel edit"><LuX className="h-4 w-4" aria-hidden /></button>
                                </form>
                              ) : (
                                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 sm:flex-nowrap sm:gap-3">
                                  {!compact && <LuGripVertical className="hidden h-4 w-4 shrink-0 cursor-grab text-muted/60 active:cursor-grabbing sm:block" aria-label="Drag to reorder news" />}
                                  <span className={`h-3 w-3 shrink-0 rounded-sm ${priorityStyles[item.priority] || 'bg-muted'}`} aria-hidden />
                                  <div className="min-w-0 flex-1 basis-full sm:basis-0">
                                    <div className="break-words whitespace-normal text-[14px] font-medium text-text">{item.title}</div>
                                  </div>
                                  <span className={`shrink-0 whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${priorityBadgeStyles[item.priority] || 'border-line bg-panel2 text-muted'}`}>
                                    {item.priority}
                                  </span>
                                  {isUpcoming && (
                                    <span className="shrink-0 whitespace-nowrap rounded-md border border-info/30 bg-info/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-info">
                                      Upcoming
                                    </span>
                                  )}
                                  {isCompleted && (
                                    <span className="shrink-0 whitespace-nowrap rounded-full border border-win/30 bg-win/10 px-2 py-1 text-[10px] font-semibold text-win">
                                      {compact ? 'News completed' : 'Completed'}
                                    </span>
                                  )}
                                  {!compact && <>
                                    <button type="button" className="inline-flex min-h-10 min-w-10 items-center justify-center rounded p-1 text-muted hover:bg-panel2 hover:text-info sm:min-h-0 sm:min-w-0" onClick={() => startEdit(item)} aria-label={`Edit ${item.title}`}><LuPencil className="h-3.5 w-3.5" aria-hidden /></button>
                                    <button type="button" className="inline-flex min-h-10 min-w-10 items-center justify-center rounded p-1 text-muted hover:bg-panel2 hover:text-info disabled:opacity-50 sm:min-h-0 sm:min-w-0" onClick={() => duplicateNews(item)} disabled={duplicatingId === item.id} aria-label={`Duplicate ${item.title}`} title="Duplicate news"><LuCopy className="h-3.5 w-3.5" aria-hidden /></button>
                                    <button type="button" className="inline-flex min-h-10 min-w-10 items-center justify-center rounded p-1 text-muted hover:bg-panel2 hover:text-loss sm:min-h-0 sm:min-w-0" onClick={() => removeNews(item)} aria-label={`Remove ${item.title}`}><LuTrash2 className="h-3.5 w-3.5" aria-hidden /></button>
                                  </>}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
              </div>
            </section>
            );
          })}
          {!groupedNews.length && (
            <p className="py-2 text-[12px] text-muted">
              {compact && news.length ? 'No current or upcoming timed news.' : 'No timed news events yet.'}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
