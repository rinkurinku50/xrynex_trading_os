'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTaskDate(value) {
  if (!value) return '';
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export default function TodayTasks() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [todayLabel, setTodayLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    const today = new Date();
    setTodayLabel(today.toLocaleDateString('en-GB', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    }));
    fetch(`/api/tasks?date=${localDateKey(today)}`, { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load today’s tasks.');
        return data;
      })
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);
  const priorityRank = { High: 0, Medium: 1, Low: 2 };
  const sortedItems = [...items].sort((a, b) =>
    (priorityRank[a.priority || 'Medium'] ?? 1) - (priorityRank[b.priority || 'Medium'] ?? 1)
  );

  async function toggle(task) {
    const done = !task.done;
    setItems((current) => current.map((item) => item.id === task.id ? { ...item, done } : item));
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done }),
    });
    if (!response.ok) {
      setItems((current) => current.map((item) => item.id === task.id ? task : item));
    }
    startTransition(() => router.refresh());
  }

  return (
    <div>
      <p className="mb-3 text-[13px] text-text">{todayLabel || 'Today'}</p>
      <ul className="divide-y divide-line">
        {loading && <li className="text-[13px] text-muted">Loading today’s tasks…</li>}
        {!loading && loadError && <li role="alert" className="text-[13px] text-loss">{loadError}</li>}
        {sortedItems.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggle(t)}
                className="h-4 w-4 shrink-0 rounded border-line bg-ink accent-win"
              />
              <span className="min-w-0 flex-1">
                <span className={`block text-[13px] ${t.done ? 'text-muted line-through' : 'text-text'}`}>{t.title}</span>
                <span className="mt-0.5 block text-[11px] text-muted">{formatTaskDate(t.task_date)}</span>
              </span>
            </label>
            <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${t.priority === 'High' ? 'border-loss/30 bg-loss/10 text-loss' : t.priority === 'Low' ? 'border-line bg-panel2 text-muted' : 'border-gold/30 bg-gold/10 text-gold'}`}>
              {t.priority || 'Medium'}
            </span>
          </li>
        ))}
        {!loading && !loadError && !items.length && <li className="text-[13px] text-muted">Nothing planned for today.</li>}
      </ul>
    </div>
  );
}
