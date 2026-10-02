'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuArrowUpRight, LuCheck, LuChevronRight, LuClock3, LuSparkles } from 'react-icons/lu';
import { formatTime12Hour } from '@/lib/routine-data';
import { preferencesUpdatedEvent, readPreferences, writePreferences } from '@/lib/client-preferences';

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const categoryColors = {
  health: 'bg-emerald-400',
  work: 'bg-sky-400',
  learning: 'bg-violet-400',
  home: 'bg-amber-400',
  personal: 'bg-pink-400',
};

export default function RoutineQuickView({ userId }) {
  const pathname = usePathname();
  const legacySuffix = encodeURIComponent(userId || 'workspace');
  const [tasks, setTasks] = useState([]);
  const [done, setDone] = useState({});
  const [autoDone, setAutoDone] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => new Date());
  const todayKey = localDateKey(now);

  const refresh = useCallback(async () => {
    const saved = await readPreferences(['routine-tasks', 'routine-done', 'routine-auto-done'], {
      'routine-tasks': `xrynex-routine-tasks:${legacySuffix}`,
      'routine-done': `xrynex-routine-done:${legacySuffix}`,
      'routine-auto-done': `xrynex-routine-auto-done:${legacySuffix}`,
    });
    setTasks(Array.isArray(saved['routine-tasks']) ? saved['routine-tasks'] : []);
    setDone(saved['routine-done'] || {});
    setAutoDone(saved['routine-auto-done'] || {});
    setLoaded(true);
    setError('');
  }, [legacySuffix]);

  useEffect(() => {
    let mounted = true;
    refresh().catch((loadError) => {
      if (mounted) {
        setError(loadError.message);
        setLoaded(true);
      }
    });
    const onPreferenceUpdate = (event) => {
      if (event.detail?.some((key) => ['routine-tasks', 'routine-done', 'routine-auto-done'].includes(key))) {
        refresh().catch((loadError) => setError(loadError.message));
      }
    };
    window.addEventListener(preferencesUpdatedEvent, onPreferenceUpdate);
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => {
      mounted = false;
      window.removeEventListener(preferencesUpdatedEvent, onPreferenceUpdate);
      window.clearInterval(timer);
    };
  }, [pathname, refresh]);

  const todayTasks = useMemo(() => tasks
    .filter((task) => !task.days?.length || task.days.includes(now.getDay()))
    .sort((a, b) => a.time.localeCompare(b.time)), [now, tasks]);
  const completed = done[todayKey] || [];
  const automaticallyCompleted = autoDone[todayKey] || [];
  const completedCount = todayTasks.filter((task) => completed.some((id) => String(id) === String(task.id))).length;
  const percent = todayTasks.length ? Math.round((completedCount / todayTasks.length) * 100) : 0;
  const nextTask = todayTasks.find((task) => !completed.some((id) => String(id) === String(task.id)) && task.time >= `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  const visibleTasks = [...todayTasks]
    .sort((a, b) => {
      const aDoneIndex = completed.findIndex((id) => String(id) === String(a.id));
      const bDoneIndex = completed.findIndex((id) => String(id) === String(b.id));
      const aDone = aDoneIndex >= 0;
      const bDone = bDoneIndex >= 0;
      if (aDone !== bDone) return aDone ? -1 : 1;
      return b.time.localeCompare(a.time);
    })
    .slice(0, 5);

  function toggleTask(taskId) {
    if (automaticallyCompleted.some((id) => String(id) === String(taskId))) return;
    const existing = done[todayKey] || [];
    const isDone = existing.some((id) => String(id) === String(taskId));
    const nextDone = isDone
      ? existing.filter((id) => String(id) !== String(taskId))
      : [...existing, taskId];
    const next = { ...done, [todayKey]: nextDone };
    setDone(next);
    writePreferences({ 'routine-done': next }).catch((saveError) => setError(saveError.message));
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-[#101c22] via-[#101923] to-[#0e1b19] shadow-[0_16px_46px_rgba(0,0,0,0.2)]" aria-labelledby="dashboard-routine-title">
      {error && <p role="alert" className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-300">{error}</p>}
      <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-emerald-400/[0.07] blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-200"><LuClock3 className="h-5 w-5" /></span>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="dashboard-routine-title" className="text-[15px] font-semibold text-white">Daily routine</h2>
              <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.07] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.12em] text-emerald-200">Today</span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted">A quick view of your daily flow</p>
          </div>
        </div>
        <Link href="/daily-routine" className="inline-flex items-center gap-1.5 rounded-lg border border-line/80 bg-black/10 px-3 py-2 text-[11px] font-semibold text-text/80 transition hover:border-emerald-300/30 hover:text-emerald-100">
          Full routine <LuArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="relative grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,.9fr)] lg:items-center">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="relative grid h-[84px] w-[84px] shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#54df91 ${percent * 3.6}deg, rgba(148,163,184,.13) ${percent * 3.6}deg 360deg)` }} aria-label={`${percent}% complete`}>
            <div className="grid h-[68px] w-[68px] place-items-center rounded-full border border-white/[0.04] bg-[#101923] text-[18px] font-bold tabular-nums text-white">{loaded ? `${percent}%` : '—'}</div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-emerald-200"><LuSparkles className="h-3.5 w-3.5" /> Today’s progress</div>
            <div className="mt-1.5 text-[19px] font-semibold tracking-tight text-white">{loaded ? `${completedCount} of ${todayTasks.length} complete` : 'Loading routine…'}</div>
            <p className="mt-1 text-[11px] text-muted">{nextTask ? 'Keep the rhythm going—one step at a time.' : todayTasks.length && completedCount === todayTasks.length ? 'Your routine is complete. Nice work.' : 'Nothing else scheduled for today.'}</p>
          </div>
        </div>

        <div className="rounded-xl border border-sky-300/15 bg-gradient-to-r from-sky-400/[0.07] to-transparent p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.15em] text-sky-200"><span className="h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_10px_rgba(104,181,255,.8)]" /> Up next</span>
            {nextTask && <time className="whitespace-nowrap font-mono text-[11px] font-semibold tabular-nums text-sky-100">{formatTime12Hour(nextTask.time)}</time>}
          </div>
          <div className="mt-1.5 truncate text-[14px] font-semibold text-white">{nextTask?.title || (completedCount === todayTasks.length && todayTasks.length ? 'All done for today' : 'No upcoming routines')}</div>
          <div className="mt-1 truncate text-[10px] text-muted">{nextTask ? `${nextTask.cat || 'Routine'}${nextTask.note ? ` · ${nextTask.note}` : ''}` : 'Open your routine to review the day.'}</div>
        </div>
      </div>

      <div className="relative border-t border-white/[0.06] px-5 sm:px-6">
        {visibleTasks.length ? visibleTasks.map((task) => {
          const isDone = completed.some((id) => String(id) === String(task.id));
          return (
            <button key={task.id} type="button" disabled={automaticallyCompleted.some((id) => String(id) === String(task.id))} className="group flex w-full items-center gap-3 border-b border-white/[0.045] py-2.5 text-left last:border-b-0 disabled:cursor-not-allowed" onClick={() => toggleTask(task.id)} aria-label={`${isDone ? 'Mark incomplete' : 'Mark complete'}: ${task.title}${automaticallyCompleted.some((id) => String(id) === String(task.id)) ? ' (locked after scheduled time)' : ''}`}>
              <span className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border transition ${isDone ? 'border-emerald-300/70 bg-emerald-300/90 text-[#0b1710]' : 'border-slate-500/70 bg-black/10 text-transparent group-hover:border-emerald-300/50'}`}><LuCheck className="h-3 w-3" /></span>
              <time className={`w-[5.25rem] shrink-0 whitespace-nowrap font-mono text-[16px] tabular-nums ${isDone ? 'text-muted/70' : 'text-muted'}`}>{formatTime12Hour(task.time)}</time>
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${categoryColors[task.cat] || 'bg-slate-400'}`} />
              <span className={`min-w-0 flex-1 truncate text-[17px] ${isDone ? 'text-muted line-through' : 'text-text/90'}`}>{task.title}</span>
              <span className="hidden text-[12px] text-muted/60 sm:block">{task.cat || 'Routine'}</span>
              <LuChevronRight className="h-3.5 w-3.5 shrink-0 text-muted/40 transition group-hover:translate-x-0.5 group-hover:text-emerald-200" />
            </button>
          );
        }) : <p className="py-5 text-center text-[11px] text-muted">No routines are scheduled for today.</p>}
      </div>

      <div className="relative flex items-center justify-between gap-3 border-t border-white/[0.06] bg-black/[0.08] px-5 py-3 sm:px-6">
        <span className="text-[10px] text-muted">{Math.min(visibleTasks.length, 5)} of {todayTasks.length} routines shown · Tap a row to update progress</span>
        <Link href="/daily-routine" className="text-[10px] font-semibold text-emerald-200/90 hover:text-emerald-100">Open routine →</Link>
      </div>
    </section>
  );
}
