'use client';

import { useEffect, useState } from 'react';
import { LuGripVertical, LuPencil, LuPlus, LuSave, LuTrash2, LuX } from 'react-icons/lu';
import SelectMenu from '@/components/SelectMenu';
import { useConfirmDialog } from '@/components/ConfirmDialogProvider';

const priorities = ['High', 'Medium', 'Low', 'Bank holiday'];
const priorityStyles = {
  High: 'bg-loss',
  Medium: 'bg-[#f08b3e]',
  Low: 'bg-gold',
  'Bank holiday': 'bg-[#94a3b2]',
};
const priorityIcons = priorityStyles;
const orderStorageKey = 'xrynex-economic-news-order';

function newYorkInputValue() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date()).replace(' ', 'T');
}

function formatNewYorkTime(value) {
  if (!value) return 'No date set';
  return `${new Date(`${value}:00Z`).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' })} NY`;
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
  const [draggedId, setDraggedId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  useEffect(() => {
    if (!compact && !eventAt) setEventAt(newYorkInputValue());
  }, [compact, eventAt]);

  useEffect(() => {
    if (!news.length) return;
    try {
      const savedOrder = JSON.parse(window.localStorage.getItem(orderStorageKey) || '[]');
      if (!Array.isArray(savedOrder) || !savedOrder.length) return;
      setNews((current) => [...current].sort((a, b) => {
        const aIndex = savedOrder.indexOf(a.id);
        const bIndex = savedOrder.indexOf(b.id);
        return (aIndex < 0 ? savedOrder.length : aIndex) - (bIndex < 0 ? savedOrder.length : bIndex);
      }));
    } catch {
      // Keep server order if browser storage is unavailable.
    }
  }, [compact, news.length]);

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
    window.localStorage.setItem(orderStorageKey, JSON.stringify(next.map((item) => item.id)));
  }

  return (
    <section className="panel">
      <header className="panel-head">
        <h2 className="panel-title"><span aria-hidden>📰</span> Economic news</h2>
        {!compact && <span className="text-[12px] text-muted">Manual events</span>}
      </header>
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
          {news.map((item) => (
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
                    <div className="text-[11px] text-muted">{formatNewYorkTime(eventValue(item))}</div>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted">{item.priority}</span>
                  {!compact && <>
                    <button type="button" className="rounded p-1 text-muted hover:bg-panel2 hover:text-info" onClick={() => startEdit(item)} aria-label={`Edit ${item.title}`}><LuPencil className="h-3.5 w-3.5" aria-hidden /></button>
                    <button type="button" className="rounded p-1 text-muted hover:bg-panel2 hover:text-loss" onClick={() => removeNews(item)} aria-label={`Remove ${item.title}`}><LuTrash2 className="h-3.5 w-3.5" aria-hidden /></button>
                  </>}
                </div>
              )}
            </li>
          ))}
          {!news.length && <li className="py-2 text-[12px] text-muted">No manual news added yet.</li>}
        </ul>
      </div>
    </section>
  );
}
