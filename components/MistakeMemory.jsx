'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiPlus, FiSearch, FiTrash2, FiX } from 'react-icons/fi';
import { mistakeStorage, rankMistakes } from '@/lib/mistake-memory';

const categories = ['Psychology', 'Risk Management', 'Entry', 'Exit', 'Discipline', 'Strategy'];
const severities = ['Critical', 'High', 'Medium', 'Low'];
const severityStyles = {
  Critical: 'border-red-500/40 bg-red-500/[0.08] text-red-400',
  High: 'border-amber-500/40 bg-amber-500/[0.08] text-amber-400',
  Medium: 'border-sky-500/35 bg-sky-500/[0.08] text-sky-300',
  Low: 'border-slate-500/35 bg-slate-500/[0.06] text-slate-400',
};

function formatOccurrence(value) {
  if (!value) return 'No occurrence recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No occurrence recorded';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (first, second) => first.toDateString() === second.toDateString();
  const day = sameDay(date, today) ? 'Today' : sameDay(date, yesterday) ? 'Yesterday' : date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  return `${day}, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function formatReview(value) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatRelativeTime(value) {
  if (!value) return 'Never';
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  if (!Number.isFinite(elapsed)) return 'Unknown';
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

function formatRecentOccurrence(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });
}

function LogOccurrenceDialog({ mistake, onCancel, onConfirm }) {
  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onCancel]);

  const accent = {
    Critical: '#ef4444', High: '#f59e0b', Medium: '#38bdf8', Low: '#64748b',
  }[mistake.severity] || '#ef4444';
  const recentOccurrences = [...new Set((Array.isArray(mistake.recentOccurrences) && mistake.recentOccurrences.length
    ? mistake.recentOccurrences
    : [mistake.lastOccurred].filter(Boolean)))].slice(0, 4);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-[radial-gradient(ellipse_at_center,rgba(127,29,29,0.22),rgba(0,0,0,0.86)_70%)] p-4 backdrop-blur-md" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <section role="dialog" aria-modal="true" aria-labelledby="log-occurrence-title" className="w-full max-w-3xl rounded-[24px] border bg-[linear-gradient(145deg,#171b23,#0d1118)] p-6 shadow-[0_0_70px_rgba(127,29,29,0.2)] sm:p-8" style={{ borderColor: `${accent}66` }}>
        <p className="text-[11px] font-extrabold tracking-[0.24em] text-red-400">⚠ YOU'VE BEEN HERE BEFORE</p>
        <h2 id="log-occurrence-title" className="mt-3 break-words text-3xl font-extrabold leading-tight text-white sm:text-5xl">{mistake.title}</h2>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 sm:gap-x-8">
          <span className="text-5xl font-black sm:text-6xl" style={{ color: accent }}>{Number(mistake.frequency) || 0}×</span>
          <span className="text-sm text-slate-400 sm:text-lg">you've done this</span>
          <span className="text-sm text-slate-400 sm:text-lg">Last time: <strong className="font-medium text-slate-200">{formatRelativeTime(mistake.lastOccurred)}</strong></span>
        </div>
        <div className="mt-5 rounded-2xl border px-4 py-4 sm:px-6 sm:py-5" style={{ borderColor: `${accent}66`, background: `linear-gradient(130deg,${accent}20,rgba(15,19,26,.25))` }}>
          <p className="text-[10px] tracking-[0.28em]" style={{ color: accent }}>THE RULE YOU JUST BROKE</p>
          <p className="mt-2 text-xl font-bold leading-snug text-white sm:text-2xl">{mistake.preventionRule}</p>
        </div>
        {recentOccurrences.length > 0 && <div className="mt-5">
          <p className="mb-2 text-[10px] font-semibold tracking-[0.24em] text-slate-500">RECENT TIMES YOU DID THIS</p>
          <ul className="space-y-1.5">{recentOccurrences.map((timestamp, index) => <li key={`${timestamp}-${index}`} className="rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-sm text-slate-300">{formatRecentOccurrence(timestamp)}</li>)}</ul>
        </div>}
        <div className="mt-6 flex flex-wrap justify-end gap-2.5 sm:mt-7">
          <button type="button" onClick={onCancel} className="rounded-xl bg-white/[0.07] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.12]">Cancel</button>
          <button type="button" onClick={onConfirm} className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-extrabold text-[#17140c] transition hover:bg-amber-400">Log it &amp; recommit</button>
        </div>
      </section>
    </div>
  );
}

function MistakeForm({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || {
    title: '', description: '', category: 'Psychology', severity: 'Medium', preventionRule: '',
  });

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    onSave(form);
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form onSubmit={submit} className="w-full max-w-xl rounded-xl border border-white/10 bg-[#151b24] p-5 shadow-2xl shadow-black/50 sm:p-6" aria-labelledby="mistake-form-title">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="mistake-form-title" className="text-lg font-semibold text-white">{initial ? 'Edit mistake' : 'Add mistake'}</h2>
          <button type="button" onClick={onClose} aria-label="Close form" className="rounded-md p-2 text-slate-400 hover:bg-white/5 hover:text-white"><FiX /></button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-medium text-slate-400 sm:col-span-2">Title
            <input required maxLength={80} value={form.title} onChange={(event) => update('title', event.target.value)} className="w-full rounded-md border border-white/10 bg-[#0d1219] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/60" />
          </label>
          <label className="space-y-1.5 text-xs font-medium text-slate-400 sm:col-span-2">Short description
            <textarea maxLength={240} rows={2} value={form.description} onChange={(event) => update('description', event.target.value)} className="w-full resize-y rounded-md border border-white/10 bg-[#0d1219] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/60" />
          </label>
          <label className="space-y-1.5 text-xs font-medium text-slate-400">Category
            <select value={form.category} onChange={(event) => update('category', event.target.value)} className="w-full rounded-md border border-white/10 bg-[#0d1219] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/60">{categories.map((category) => <option key={category}>{category}</option>)}</select>
          </label>
          <label className="space-y-1.5 text-xs font-medium text-slate-400">Severity
            <select value={form.severity} onChange={(event) => update('severity', event.target.value)} className="w-full rounded-md border border-white/10 bg-[#0d1219] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/60">{severities.map((severity) => <option key={severity}>{severity}</option>)}</select>
          </label>
          <label className="space-y-1.5 text-xs font-medium text-slate-400 sm:col-span-2">Prevention rule
            <textarea required maxLength={240} rows={2} value={form.preventionRule} onChange={(event) => update('preventionRule', event.target.value)} className="w-full resize-y rounded-md border border-white/10 bg-[#0d1219] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/60" />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
          <button type="submit" className="rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-[#17140c] hover:bg-amber-400">{initial ? 'Save changes' : 'Add mistake'}</button>
        </div>
      </form>
    </div>
  );
}

function ReviewPointForm({ initial, onClose, onSave }) {
  const [text, setText] = useState(initial?.text || '');

  function submit(event) {
    event.preventDefault();
    const value = text.trim();
    if (value) onSave(value);
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form onSubmit={submit} className="w-full max-w-lg rounded-xl border border-white/10 bg-[#151b24] p-5 shadow-2xl shadow-black/50 sm:p-6" aria-labelledby="review-point-title">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="review-point-title" className="text-lg font-semibold text-white">{initial ? 'Edit review point' : 'Add review point'}</h2>
          <button type="button" onClick={onClose} aria-label="Close form" className="rounded-md p-2 text-slate-400 hover:bg-white/5 hover:text-white"><FiX /></button>
        </div>
        <label className="block space-y-1.5 text-xs font-medium text-slate-400">Before-you-trade point
          <textarea autoFocus required maxLength={240} rows={3} value={text} onChange={(event) => setText(event.target.value)} className="w-full resize-y rounded-md border border-white/10 bg-[#0d1219] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/60" />
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
          <button type="submit" className="rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-[#17140c] hover:bg-amber-400">{initial ? 'Save changes' : 'Add point'}</button>
        </div>
      </form>
    </div>
  );
}

function MistakeCard({ mistake, onAcknowledge, onEdit, onDelete, onHappened }) {
  const severity = severityStyles[mistake.severity] || severityStyles.Medium;
  const edge = mistake.severity === 'Critical' ? 'border-l-red-500 shadow-[0_0_24px_rgba(239,68,68,0.08)]' : mistake.severity === 'High' ? 'border-l-amber-500' : mistake.severity === 'Medium' ? 'border-l-sky-500/70' : 'border-l-slate-600 opacity-90';
  return (
    <article className={`group relative min-w-0 overflow-hidden rounded-xl border border-white/[0.08] border-l-[3px] bg-[linear-gradient(135deg,rgba(31,36,45,0.98),rgba(20,25,33,0.98))] p-4 shadow-lg shadow-black/10 transition duration-200 hover:-translate-y-0.5 hover:border-white/[0.14] hover:shadow-xl hover:shadow-black/20 ${edge}`}>
      {mistake.severity === 'Critical' && <span className="absolute inset-y-0 left-0 w-[2px] animate-pulse bg-red-500/70" aria-hidden="true" />}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap gap-1.5">
          <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${severity}`}>{mistake.severity}</span>
          <span className="rounded border border-white/[0.08] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">{mistake.category}</span>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <button type="button" onClick={() => onEdit(mistake)} aria-label={`Edit ${mistake.title}`} title="Edit mistake" className="rounded p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><FiEdit2 size={14} /></button>
          <button type="button" onClick={() => onDelete(mistake)} aria-label={`Delete ${mistake.title}`} title="Delete mistake" className="rounded p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400"><FiTrash2 size={14} /></button>
        </div>
      </div>
      <h3 className="mt-2 text-base font-semibold text-slate-100">{mistake.title}</h3>
      <p className="mt-1 min-h-10 text-xs leading-relaxed text-slate-400">{mistake.description || 'No description added.'}</p>
      <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
        <span className={`font-semibold ${mistake.frequency >= 5 ? 'text-red-400' : 'text-slate-300'}`}>Repeated {mistake.frequency} {mistake.frequency === 1 ? 'time' : 'times'}</span>
        <time className="text-slate-500">{formatOccurrence(mistake.lastOccurred)}</time>
      </div>
      <div className="mt-3 rounded-lg border border-white/[0.04] bg-[#0e1218]/90 px-3 py-2.5">
        <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Prevention rule</div>
        <p className="text-xs leading-relaxed text-slate-200">{mistake.preventionRule}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" checked={Boolean(mistake.acknowledged)} onChange={(event) => onAcknowledge(mistake.id, event.target.checked)} className="h-4 w-4 accent-amber-500" />
          I will avoid this today
        </label>
        <button type="button" onClick={() => onHappened(mistake)} className="rounded-md border border-white/[0.09] bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-200">+1 happened</button>
      </div>
    </article>
  );
}

export default function MistakeMemory() {
  const [mistakes, setMistakes] = useState([]);
  const [lastReviewed, setLastReviewed] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All categories');
  const [severity, setSeverity] = useState('All severities');
  const [formMistake, setFormMistake] = useState(undefined);
  const [reviewPoints, setReviewPoints] = useState([]);
  const [reviewPointsLoaded, setReviewPointsLoaded] = useState(false);
  const [formReviewPoint, setFormReviewPoint] = useState(undefined);
  const [pendingOccurrence, setPendingOccurrence] = useState(null);
  const [popupBlocked, setPopupBlocked] = useState(false);

  useEffect(() => {
    const loaded = mistakeStorage.load();
    const savedPoints = mistakeStorage.loadReviewPoints();
    setMistakes(loaded);
    setLastReviewed(mistakeStorage.loadLastReviewed());
    mistakeStorage.save(loaded);
    setReviewPoints(savedPoints ?? rankMistakes(loaded.filter((mistake) => mistake.active)).slice(0, 3).map((mistake) => ({
      id: `rule-${mistake.id}`,
      text: mistake.preventionRule,
    })));
    setReviewPointsLoaded(true);
  }, []);

  useEffect(() => {
    function syncMistakes(event) {
      if (event.key !== 'tradingMistakes.v1') return;
      setMistakes(mistakeStorage.load());
    }

    window.addEventListener('storage', syncMistakes);
    return () => window.removeEventListener('storage', syncMistakes);
  }, []);

  useEffect(() => {
    if (mistakes.length) mistakeStorage.save(mistakes);
  }, [mistakes]);

  useEffect(() => {
    if (reviewPointsLoaded) mistakeStorage.saveReviewPoints(reviewPoints);
  }, [reviewPoints, reviewPointsLoaded]);

  const ranked = useMemo(() => rankMistakes(mistakes.filter((mistake) => mistake.active)), [mistakes]);
  const repeated = [...ranked].sort((first, second) =>
    second.frequency - first.frequency
    || new Date(second.lastOccurred).getTime() - new Date(first.lastOccurred).getTime()
  ).slice(0, 4);
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ranked.filter((mistake) =>
      (category === 'All categories' || mistake.category === category)
      && (severity === 'All severities' || mistake.severity === severity)
      && (!query || [mistake.title, mistake.description, mistake.preventionRule].some((value) => value.toLowerCase().includes(query)))
    );
  }, [ranked, search, category, severity]);
  const reviewedToday = lastReviewed && new Date(lastReviewed).toDateString() === new Date().toDateString();

  function updateMistake(id, changes) {
    setMistakes((current) => current.map((mistake) => {
      if (mistake.id !== id) return mistake;
      const acknowledgedDate = Object.hasOwn(changes, 'acknowledged')
        ? changes.acknowledged ? new Date().toDateString() : null
        : mistake.acknowledgedDate;
      return { ...mistake, ...changes, acknowledgedDate, updatedAt: new Date().toISOString() };
    }));
  }

  function markReviewed() {
    const timestamp = new Date().toISOString();
    mistakeStorage.saveLastReviewed(timestamp);
    setLastReviewed(timestamp);
  }

  function startTradingSession() {
    markReviewed();
    const width = window.screen.availWidth || 1440;
    const height = window.screen.availHeight || 900;
    const left = window.screen.availLeft || 0;
    const top = window.screen.availTop || 0;
    const monitorWindow = window.open(
      '/mistake-monitor.html',
      'trading-mistake-monitor',
      `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no`
    );

    if (monitorWindow) {
      monitorWindow.focus();
      setPopupBlocked(false);
    } else {
      setPopupBlocked(true);
    }
  }

  function saveReviewPoint(text) {
    if (formReviewPoint) {
      setReviewPoints((current) => current.map((point) => point.id === formReviewPoint.id ? { ...point, text } : point));
    } else {
      setReviewPoints((current) => [...current, { id: window.crypto?.randomUUID?.() || `rule-${Date.now()}`, text }]);
    }
    setFormReviewPoint(undefined);
  }

  function deleteReviewPoint(point) {
    if (!window.confirm('Remove this point from Before You Trade?')) return;
    setReviewPoints((current) => current.filter((item) => item.id !== point.id));
  }

  function saveMistake(values) {
    const now = new Date().toISOString();
    if (formMistake) {
      updateMistake(formMistake.id, values);
    } else {
      setMistakes((current) => [...current, {
        ...values,
        id: window.crypto?.randomUUID?.() || `mistake-${Date.now()}`,
        frequency: 0,
        lastOccurred: now,
        active: true,
        acknowledged: false,
        createdAt: now,
        updatedAt: now,
      }]);
    }
    setFormMistake(undefined);
  }

  function deleteMistake(mistake) {
    if (!window.confirm(`Delete "${mistake.title}" from your mistake memory?`)) return;
    setMistakes((current) => current.filter((item) => item.id !== mistake.id));
  }

  function recordOccurrence() {
    if (!pendingOccurrence) return;
    const now = new Date().toISOString();
    const recentOccurrences = [...new Set([
      now,
      ...(pendingOccurrence.recentOccurrences || []),
      pendingOccurrence.lastOccurred,
    ].filter(Boolean))].slice(0, 5);
    updateMistake(pendingOccurrence.id, {
      frequency: (Number(pendingOccurrence.frequency) || 0) + 1,
      lastOccurred: now,
      recentOccurrences,
      acknowledged: false,
    });
    setPendingOccurrence(null);
  }

  return (
    <section id="mistake-memory" className="mistake-memory-enter relative isolate overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1117] p-4 shadow-2xl shadow-black/20 sm:p-6 lg:p-7" aria-labelledby="mistake-memory-title">
      <div className="pointer-events-none absolute -right-20 -top-32 -z-10 h-80 w-80 rounded-full bg-amber-500/[0.035] blur-3xl" />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 id="mistake-memory-title" className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Trading Mistakes</h1>
            <span className="rounded-full border border-amber-500/25 bg-amber-500/[0.08] px-2.5 py-1 text-[10px] font-semibold text-amber-300">{ranked.length} Active Mistakes</span>
          </div>
          <p className="mt-1.5 text-sm text-slate-400">Your recurring mistakes — review before you trade.</p>
          <p className="mt-2 text-xs font-medium text-slate-500">Before you look at the market, look at your own mistakes.</p>
        </div>
        <div className="ml-auto text-right">
          <div className={`flex items-center justify-end gap-2 text-[10px] font-bold tracking-wide ${reviewedToday ? 'text-emerald-400' : 'text-red-400'}`}>
            <span className={`h-2 w-2 rounded-full ${reviewedToday ? 'bg-emerald-400' : 'animate-pulse bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]'}`} />
            {reviewedToday ? 'REVIEWED TODAY' : 'REVIEW BEFORE TRADING'}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">Last reviewed: <span className="text-slate-300">{formatReview(lastReviewed)}</span></p>
        </div>
      </header>

      <section className="mt-6" aria-label="Most repeated mistakes">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[9px] font-bold tracking-[0.18em] text-slate-500">MOST REPEATED</span>
          {repeated.map((mistake) => <span key={mistake.id} className="rounded-full border border-white/[0.07] bg-white/[0.045] px-3 py-1.5 text-[11px] text-slate-300">{mistake.title} <span className={mistake.frequency >= 5 ? 'font-semibold text-red-400' : 'font-semibold text-amber-300'}>— {mistake.frequency} times</span></span>)}
          {!repeated.length && <span className="text-xs text-slate-500">No active mistakes recorded.</span>}
        </div>
      </section>

      <section className="mt-5 rounded-xl border border-amber-500/25 bg-[linear-gradient(115deg,rgba(120,74,14,0.18),rgba(58,31,24,0.15),rgba(15,20,27,0.94))] p-4 sm:p-5" aria-labelledby="before-trading-title">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="before-trading-title" className="text-[11px] font-extrabold tracking-[0.16em] text-amber-400">⚠ BEFORE YOU TRADE</h2>
              <button type="button" onClick={() => setFormReviewPoint(null)} className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/[0.06] px-2.5 py-1.5 text-[10px] font-semibold text-amber-200 transition hover:bg-amber-500/[0.12]"><FiPlus size={12} /> Add point</button>
            </div>
            {reviewPoints.length ? <ol className="mt-2.5 space-y-1.5">{reviewPoints.map((point, index) => <li key={point.id} className="group flex items-start gap-2.5 text-sm leading-relaxed text-slate-200"><span className="pt-px font-bold text-amber-400">{index + 1}.</span><span className="min-w-0 flex-1">{point.text}</span><span className="flex shrink-0 gap-0.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"><button type="button" onClick={() => setFormReviewPoint(point)} aria-label={`Edit review point ${index + 1}`} title="Edit point" className="rounded p-1 text-slate-500 hover:bg-white/5 hover:text-white"><FiEdit2 size={13} /></button><button type="button" onClick={() => deleteReviewPoint(point)} aria-label={`Remove review point ${index + 1}`} title="Remove point" className="rounded p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-400"><FiTrash2 size={13} /></button></span></li>)}</ol> : <p className="mt-2 text-sm text-slate-400">No review points yet. Add one before your next trading session.</p>}
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2">
            <button type="button" onClick={startTradingSession} className="rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-3.5 text-xs font-extrabold tracking-wide text-[#17140c] shadow-lg shadow-amber-900/20 transition hover:-translate-y-0.5 hover:from-amber-300 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300/70">START TRADING SESSION</button>
            {popupBlocked && <div role="status" className="max-w-64 text-right text-[11px] text-amber-200">
              Pop-ups are blocked. <a href="/mistake-monitor.html" target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-2">Open Mistake Monitor</a>
            </div>}
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-2 sm:grid-cols-[minmax(180px,1.1fr)_minmax(150px,1fr)_minmax(150px,1fr)_auto]">
        <label className="relative block">
          <FiSearch aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search mistakes..." aria-label="Search mistakes" className="w-full rounded-lg border border-white/[0.09] bg-[#10151d] py-2.5 pl-9 pr-3 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-amber-500/40" />
        </label>
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category" className="rounded-lg border border-white/[0.09] bg-[#10151d] px-3 py-2.5 text-xs text-slate-300 outline-none focus:border-amber-500/40"><option>All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
        <select value={severity} onChange={(event) => setSeverity(event.target.value)} aria-label="Filter by severity" className="rounded-lg border border-white/[0.09] bg-[#10151d] px-3 py-2.5 text-xs text-slate-300 outline-none focus:border-amber-500/40"><option>All severities</option>{severities.map((item) => <option key={item}>{item}</option>)}</select>
        <button type="button" onClick={() => setFormMistake(null)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.09] bg-white/[0.06] px-3 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-200"><FiPlus size={14} /> Add Mistake</button>
      </div>

      {visible.length ? <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">{visible.map((mistake) => <MistakeCard key={mistake.id} mistake={mistake} onAcknowledge={(id, acknowledged) => updateMistake(id, { acknowledged })} onEdit={setFormMistake} onDelete={deleteMistake} onHappened={setPendingOccurrence} />)}</div> : (
        <div className="mt-3 rounded-xl border border-dashed border-white/[0.1] px-5 py-12 text-center">
          <p className="text-sm font-medium text-slate-300">No mistakes match these filters.</p>
          <p className="mt-1 text-xs text-slate-500">Adjust your search or filters to see your mistake memory.</p>
        </div>
      )}
      {formMistake !== undefined && <MistakeForm initial={formMistake || undefined} onClose={() => setFormMistake(undefined)} onSave={saveMistake} />}
      {formReviewPoint !== undefined && <ReviewPointForm initial={formReviewPoint || undefined} onClose={() => setFormReviewPoint(undefined)} onSave={saveReviewPoint} />}
      {pendingOccurrence && <LogOccurrenceDialog mistake={pendingOccurrence} onCancel={() => setPendingOccurrence(null)} onConfirm={recordOccurrence} />}
    </section>
  );
}