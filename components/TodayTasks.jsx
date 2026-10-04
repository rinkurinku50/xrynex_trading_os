'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LuArrowUpRight, LuCheck } from 'react-icons/lu';
import { formatTime12Hour } from '@/lib/routine-data';

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

function isReminderUpcoming(value, now) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return false;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes > now.getHours() * 60 + now.getMinutes();
}

export default function TodayTasks() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [todayLabel, setTodayLabel] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const today = new Date();
    setTodayLabel(today.toLocaleDateString('en-GB', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    }));
    const loadTasks = () => fetch(`/api/tasks?date=${localDateKey(today)}`, { cache: 'no-store' })
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

    loadTasks();
    window.addEventListener('tasks-updated', loadTasks);
    return () => {
      cancelled = true;
      window.removeEventListener('tasks-updated', loadTasks);
    };
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
    <section className="relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-[#101c22] via-[#101923] to-[#0e1b19] shadow-[0_16px_46px_rgba(0,0,0,0.2)]" aria-labelledby="today-tasks-title">
      <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-emerald-400/[0.07] blur-3xl" />
      <header className="relative flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-200"><LuCheck className="h-5 w-5" /></span>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="today-tasks-title" className="text-[15px] font-semibold text-white">Today’s tasks</h2>
              <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.07] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.12em] text-emerald-200">Today</span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted">{todayLabel || 'Your one-off tasks for today'}</p>
          </div>
        </div>
        <Link href="/daily-tasks" className="inline-flex items-center gap-1.5 rounded-lg border border-line/80 bg-black/10 px-3 py-2 text-[11px] font-semibold text-text/80 transition hover:border-emerald-300/30 hover:text-emerald-100">
          All tasks <LuArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      <div className="relative px-5 py-4 sm:px-6">
        <ul className="divide-y divide-white/[0.06]">
          {loading && <li className="text-[13px] text-muted">Loading today’s tasks…</li>}
          {!loading && loadError && <li role="alert" className="text-[13px] text-loss">{loadError}</li>}
          {sortedItems.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
              <button
                type="button"
                role="checkbox"
                aria-checked={t.done}
                aria-label={`${t.done ? 'Mark incomplete' : 'Mark complete'}: ${t.title}`}
                onClick={() => toggle(t)}
                className={`group grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${t.done ? 'border-emerald-300/70 bg-emerald-300/90 text-[#0b1710]' : 'border-slate-500/70 bg-black/10 text-transparent hover:border-emerald-300/50'}`}
              >
                <LuCheck className="h-3 w-3" />
              </button>
              <span className="min-w-0 flex-1">
                <span className={`block text-[17px] ${t.done ? 'text-muted line-through' : 'text-text/90'}`}>{t.title}</span>
                <span className="mt-0.5 block text-[11px] text-muted">{formatTaskDate(t.task_date)}</span>
                {!t.done && isReminderUpcoming(t.reminder_time, now) && (
                  <span className="mt-0.5 block text-[11px] text-info">Reminder at {formatTime12Hour(t.reminder_time)}</span>
                )}
              </span>
              <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${t.priority === 'High' ? 'border-loss/30 bg-loss/10 text-loss' : t.priority === 'Low' ? 'border-line bg-panel2 text-muted' : 'border-gold/30 bg-gold/10 text-gold'}`}>
                {t.priority || 'Medium'}
              </span>
            </li>
          ))}
          {!loading && !loadError && !items.length && <li className="text-[13px] text-muted">Nothing planned for today.</li>}
        </ul>
      </div>
    </section>
  );
}
