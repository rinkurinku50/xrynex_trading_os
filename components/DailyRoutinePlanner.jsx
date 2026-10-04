'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { LuCopy } from 'react-icons/lu';
import { useConfirmDialog } from '@/components/ConfirmDialogProvider';
import { formatTime12Hour } from '@/lib/routine-data';
import { readPreferences, writePreferences } from '@/lib/client-preferences';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ACCENT_SWATCHES = ['#0f766e', '#2563eb', '#ec4899', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#f97316'];

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date, offset) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function formatFriendlyDate(date) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

function startOfWeek(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function getTaskMatchesDay(task, date) {
  const day = date.getDay();
  if (!task.days || task.days.length === 0) return true;
  return task.days.includes(day);
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '');
  const value = clean.length === 3
    ? clean.split('').map((char) => char + char).join('')
    : clean;
  const int = Number.parseInt(value, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function ProgressRing({ value }) {
  const size = 96;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (circumference * value) / 100;
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="progress-ring" aria-label={`${Math.round(value)} percent complete`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--line)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--acc)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: reducedMotion ? 'none' : 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  );
}

function HeaderCard({ selectedDate, tasks, done }) {
  const selectedKey = toDateKey(selectedDate);
  const selectedTasks = tasks.filter((task) => getTaskMatchesDay(task, selectedDate));
  const completedCount = selectedTasks.filter((task) => (done[selectedKey] || []).includes(task.id)).length;
  const percent = selectedTasks.length ? Math.round((completedCount / selectedTasks.length) * 100) : 0;

  return (
    <div className="routine-panel routine-header-card">
      <h1 className="routine-title">My routine</h1>
      <div className="routine-inline-date">{formatFriendlyDate(selectedDate)}</div>
      <div className="routine-progress-row">
        <ProgressRing value={percent} />
        <div className="routine-progress-copy">
          <div className="routine-progress-value">{percent}%</div>
          <div className="routine-progress-meta">{completedCount} of {selectedTasks.length} done</div>
        </div>
      </div>
    </div>
  );
}

function WeekStrip({ selectedDate, tasks, done, onSelectDate }) {
  const weekDates = useMemo(() => {
    const start = startOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [selectedDate]);

  return (
    <div className="routine-panel routine-week-strip">
      <div className="panel-header-copy">This week</div>
      <div className="routine-week-grid">
        {weekDates.map((dayDate) => {
          const key = toDateKey(dayDate);
          const dayTasks = tasks.filter((task) => getTaskMatchesDay(task, dayDate));
          const doneCount = dayTasks.filter((task) => (done[key] || []).includes(task.id)).length;
          const percent = dayTasks.length ? Math.round((doneCount / dayTasks.length) * 100) : 0;
          const selected = toDateKey(dayDate) === toDateKey(selectedDate);
          return (
            <button
              key={key}
              type="button"
              className={`routine-day-cell${selected ? ' is-selected' : ''}`}
              onClick={() => onSelectDate(dayDate)}
              aria-label={`${WEEKDAY_NAMES[dayDate.getDay()]} ${dayDate.getDate()}`}
            >
              <div className="routine-day-letter">{DAY_LABELS[dayDate.getDay()]}</div>
              <div className="routine-day-number">{dayDate.getDate()}</div>
              <div className="routine-day-bar-wrap">
                <div className="routine-day-bar" style={{ height: `${Math.max(4, percent)}%` }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CategoryList({ categories, selectedCategory, onSelectCategory, tasks, selectedDate, onAddCategory }) {
  const [inputValue, setInputValue] = useState('');
  const palette = ACCENT_SWATCHES;
  const categoryCounts = useMemo(() => {
    const counts = {};
    categories.forEach((category) => {
      if (category.id === 'all') {
        counts[category.id] = tasks.filter((task) => getTaskMatchesDay(task, selectedDate)).length;
      } else {
        counts[category.id] = tasks.filter((task) => getTaskMatchesDay(task, selectedDate) && task.cat === category.id).length;
      }
    });
    return counts;
  }, [categories, tasks, selectedDate]);

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const nextIndex = categories.filter((category) => category.id !== 'all').length % palette.length;
    const nextColor = palette[nextIndex];
    onAddCategory({ id: trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), n: trimmed, c: nextColor });
    setInputValue('');
  };

  return (
    <div className="routine-panel routine-categories">
      <div className="panel-header-copy">Categories</div>
      <div className="routine-category-list">
        {categories.map((category) => {
          const isActive = selectedCategory === category.id;
          return (
            <button
              key={category.id}
              type="button"
              className={`routine-category-item${isActive ? ' is-selected' : ''}`}
              aria-pressed={isActive}
              onClick={() => onSelectCategory(category.id)}
            >
              <span className="routine-category-dot" style={{ background: category.c }} />
              <span className="routine-category-name">{category.n}</span>
              <span className="routine-category-count">{categoryCounts[category.id] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div className="routine-add-category-row">
        <input
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleAdd();
            }
          }}
          placeholder="New category"
          className="routine-input routine-category-input"
          aria-label="New category"
        />
        <button type="button" className="routine-primary-button small" onClick={handleAdd}>Add</button>
      </div>
    </div>
  );
}

function AppearanceSettings({ accent, theme, colorPalette, onAccentChange, onThemeChange }) {
  return (
    <div className="routine-panel routine-appearance">
      <div className="panel-header-copy">Accent color</div>
      <div className="routine-swatch-row">
        {colorPalette.map((swatch) => (
          <button
            key={swatch}
            type="button"
            aria-label={`Use accent ${swatch}`}
            className={`routine-swatch${accent === swatch ? ' is-selected' : ''}`}
            style={{ background: swatch }}
            onClick={() => onAccentChange(swatch)}
          />
        ))}
      </div>
      <div className="routine-segmented" role="tablist" aria-label="Theme selection">
        {['auto', 'light', 'dark'].map((option) => (
          <button
            key={option}
            type="button"
            className={`routine-segment${theme === option ? ' is-selected' : ''}`}
            aria-pressed={theme === option}
            onClick={() => onThemeChange(option)}
          >
            {option === 'auto' ? 'Auto' : option === 'light' ? 'Light' : 'Dark'}
          </button>
        ))}
      </div>
    </div>
  );
}

function RoutineList({ tasks, categories, selectedDate, categoryId, done, now, onToggleDone, onDuplicate, onOpenEditDialog }) {
  const groups = [
    { key: 'morning', label: 'Morning', start: 0, end: 12 },
    { key: 'afternoon', label: 'Afternoon', start: 12, end: 17 },
    { key: 'evening', label: 'Evening', start: 17, end: 24 },
  ];

  const dayTasks = tasks.filter((task) => getTaskMatchesDay(task, selectedDate) && (categoryId === 'all' || task.cat === categoryId));

  return (
    <div className="routine-list-root">
      {groups.map((group) => {
        const groupTasks = dayTasks
          .filter((task) => {
            const [hours] = task.time.split(':').map(Number);
            return hours >= group.start && hours < group.end;
          })
          .sort((a, b) => a.time.localeCompare(b.time));

        if (!groupTasks.length) return null;

        return (
          <div key={group.key} className="routine-group">
            <div className="routine-group-title">
              {group.label} <span>{groupTasks.length} {groupTasks.length === 1 ? 'routine' : 'routines'}</span>
            </div>

            {groupTasks.map((task) => {
              const isDone = (done[toDateKey(selectedDate)] || []).includes(task.id);
              const isScheduledTimePassed = toDateKey(selectedDate) === toDateKey(now)
                && task.time <= `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
              const category = categories.find((entry) => entry.id === task.cat);
              return (
                <div
                  key={task.id}
                  className={`routine-card${isDone ? ' is-done' : ''}`}
                  style={{ borderLeft: `4px solid ${category?.c || '#64748b'}` }}
                >
                  <div className="routine-card-main">
                    <button
                      type="button"
                      className={`routine-check${isDone ? ' is-active' : ''}${isDone && isScheduledTimePassed ? ' is-locked' : ''}`}
                      aria-label={isDone
                        ? isScheduledTimePassed ? `${task.title} complete; locked after scheduled time` : `Uncheck ${task.title}`
                        : `Check ${task.title}`}
                      title={isDone && isScheduledTimePassed ? 'Completed at the scheduled time and locked' : undefined}
                      disabled={isDone && isScheduledTimePassed}
                      onClick={() => onToggleDone(task.id)}
                    >
                      {isDone && <span>✓</span>}
                    </button>

                    <div className="routine-time" aria-label={formatTime12Hour(task.time)}>{formatTime12Hour(task.time)}</div>

                    <div className="routine-task-copy">
                      <div className={`routine-task-title${isDone ? ' is-done' : ''}`}>{task.title}</div>
                      <div className="routine-task-meta">{category.n}{task.note ? ` · ${task.note}` : ''}</div>
                    </div>
                  </div>

                  <div className="routine-card-actions">
                    <button
                      type="button"
                      className="routine-duplicate-button"
                      onClick={() => onDuplicate(task)}
                      aria-label={`Duplicate ${task.title}`}
                      title="Duplicate routine"
                    >
                      <LuCopy aria-hidden="true" />
                    </button>
                    <button type="button" className="routine-edit-link" onClick={() => onOpenEditDialog(task)}>
                      Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {!dayTasks.length && (
        <div className="routine-empty-state">
          Nothing scheduled here. Add a routine to start building your day.
        </div>
      )}
    </div>
  );
}

function RoutineDialog({ dialogRef, mode, draft, setDraft, onClose, onSave, onDelete, nameInputRef, categories }) {
  return (
    <dialog ref={dialogRef} className="routine-dialog" onClose={onClose}>
      <div className="routine-dialog-inner">
        <h2 className="routine-dialog-title">{mode === 'edit' ? 'Edit routine' : 'Add routine'}</h2>

        <label className="routine-field-label" htmlFor="routine-name">Name</label>
        <input
          id="routine-name"
          ref={nameInputRef}
          type="text"
          className="routine-input"
          value={draft.title}
          onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          placeholder="e.g. Morning stretch"
          required
        />

        <div className="routine-two-col">
          <div>
            <label className="routine-field-label" htmlFor="routine-time">Time</label>
            <input
              id="routine-time"
              type="time"
              className="routine-input"
              value={draft.time}
              onChange={(event) => setDraft((current) => ({ ...current, time: event.target.value }))}
            />
          </div>

          <div>
            <label className="routine-field-label" htmlFor="routine-category">Category</label>
            <div className="routine-select-wrap">
              <select
                id="routine-category"
                className="routine-input"
                value={draft.cat}
                onChange={(event) => setDraft((current) => ({ ...current, cat: event.target.value }))}
              >
                {categories.filter((category) => category.id !== 'all').map((category) => (
                  <option key={category.id} value={category.id}>{category.n}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <label className="routine-field-label" htmlFor="routine-days">Repeats on</label>
        <div className="routine-days-row" id="routine-days">
          {WEEKDAY_NAMES.map((label, index) => {
            const active = draft.days.includes(index);
            return (
              <button
                key={label}
                type="button"
                className={`routine-day-toggle${active ? ' is-active' : ''}`}
                aria-label={label}
                aria-pressed={active}
                onClick={() => {
                  setDraft((current) => {
                    const exists = current.days.includes(index);
                    const nextDays = exists
                      ? current.days.filter((day) => day !== index)
                      : [...current.days, index].sort((a, b) => a - b);
                    return { ...current, days: nextDays };
                  });
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <label className="routine-field-label" htmlFor="routine-note">Note (optional)</label>
        <textarea
          id="routine-note"
          className="routine-input routine-textarea"
          value={draft.note}
          maxLength={120}
          placeholder="Optional note"
          onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value.slice(0, 120) }))}
        />

        <div className="routine-dialog-actions">
          {mode === 'edit' && (
            <button type="button" className="routine-link-button delete" onClick={onDelete}>
              Delete
            </button>
          )}
          <div className="routine-dialog-actions-right">
            <button type="button" className="routine-secondary-button" onClick={onClose}>Cancel</button>
            <button type="button" className="routine-primary-button" onClick={onSave}>Save routine</button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

export default function DailyRoutinePlanner({ userId }) {
  const confirm = useConfirmDialog();
  const legacySuffix = encodeURIComponent(userId || 'workspace');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [tasks, setTasks] = useState([]);
  const [done, setDone] = useState({});
  const [categories, setCategories] = useState([]);
  const [routineDataLoaded, setRoutineDataLoaded] = useState(false);
  const [preferenceError, setPreferenceError] = useState('');
  const [autoDone, setAutoDone] = useState({});
  const [now, setNow] = useState(() => new Date());
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [accent, setAccent] = useState('#0f766e');
  const [theme, setTheme] = useState('auto');
  const [dialogMode, setDialogMode] = useState('add');
  const [editingTask, setEditingTask] = useState(null);
  const [draft, setDraft] = useState({
    title: '',
    time: '08:00',
    cat: 'health',
    days: [0, 1, 2, 3, 4, 5, 6],
    note: '',
  });
  const dialogRef = useRef(null);
  const nameInputRef = useRef(null);
  const duplicateGuardRef = useRef(new Set());

  useEffect(() => {
    let mounted = true;
    readPreferences([
      'routine-tasks', 'routine-done', 'routine-auto-done', 'routine-categories', 'routine-accent', 'routine-theme',
    ], {
      'routine-tasks': `xrynex-routine-tasks:${legacySuffix}`,
      'routine-done': `xrynex-routine-done:${legacySuffix}`,
      'routine-auto-done': `xrynex-routine-auto-done:${legacySuffix}`,
      'routine-categories': `xrynex-routine-categories:${legacySuffix}`,
      'routine-accent': 'routine-accent',
      'routine-theme': 'routine-theme',
    }).then((saved) => {
      if (!mounted) return;
      if (Array.isArray(saved['routine-tasks'])) setTasks(saved['routine-tasks']);
      if (saved['routine-done'] && typeof saved['routine-done'] === 'object' && !Array.isArray(saved['routine-done'])) setDone(saved['routine-done']);
      if (saved['routine-auto-done'] && typeof saved['routine-auto-done'] === 'object' && !Array.isArray(saved['routine-auto-done'])) setAutoDone(saved['routine-auto-done']);
      if (Array.isArray(saved['routine-categories']) && saved['routine-categories'].length) setCategories(saved['routine-categories']);
      if (typeof saved['routine-accent'] === 'string') setAccent(saved['routine-accent']);
      if (typeof saved['routine-theme'] === 'string') setTheme(saved['routine-theme']);
      setRoutineDataLoaded(true);
    }).catch((error) => {
      if (mounted) setPreferenceError(error.message);
    });
    return () => { mounted = false; };
  }, [legacySuffix]);

  useEffect(() => {
    if (!routineDataLoaded) return;
    const timer = window.setTimeout(() => {
      writePreferences({
        'routine-tasks': tasks,
        'routine-done': done,
        'routine-auto-done': autoDone,
        'routine-categories': categories,
        'routine-accent': accent,
        'routine-theme': theme,
      }).then(() => setPreferenceError('')).catch((error) => setPreferenceError(error.message));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [accent, autoDone, categories, done, routineDataLoaded, tasks, theme]);

  useEffect(() => {
    const updateClockAndAutoComplete = () => {
      const current = new Date();
      setNow(current);
      if (!routineDataLoaded || toDateKey(selectedDate) !== toDateKey(current)) return;

      const currentTime = `${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}`;
      const dueIds = tasks
        .filter((task) => getTaskMatchesDay(task, current) && task.time <= currentTime)
        .map((task) => task.id);
      if (!dueIds.length) return;

      const currentDayDone = done[toDateKey(current)] || [];
      const currentDayAutoDone = autoDone[toDateKey(current)] || [];
      const newlyCompleted = dueIds.filter((id) => !currentDayDone.some((doneId) => String(doneId) === String(id)));
      const newlyAutoDone = dueIds.filter((id) => (
        !currentDayDone.some((doneId) => String(doneId) === String(id))
        && !currentDayAutoDone.some((doneId) => String(doneId) === String(id))
      ));
      if (!newlyCompleted.length && !newlyAutoDone.length) return;

      const dateKey = toDateKey(current);
      const nextDone = newlyCompleted.length
        ? { ...done, [dateKey]: [...currentDayDone, ...newlyCompleted] }
        : done;
      const nextAutoDone = newlyAutoDone.length
        ? { ...autoDone, [dateKey]: [...currentDayAutoDone, ...newlyAutoDone] }
        : autoDone;
      if (newlyCompleted.length) setDone(nextDone);
      if (newlyAutoDone.length) setAutoDone(nextAutoDone);
    };

    updateClockAndAutoComplete();
    const timer = window.setInterval(updateClockAndAutoComplete, 15_000);
    return () => window.clearInterval(timer);
  }, [autoDone, done, routineDataLoaded, selectedDate, tasks]);

  const routineShellStyle = {
    '--bg': '#0a0e13',
    '--panel': '#111820',
    '--panel-2': '#161f29',
    '--panel-3': '#0f1d2a',
    '--ink': '#d8e2ec',
    '--mute': '#7b8b9c',
    '--line': '#1f2b37',
    '--soft': '#0a0e13',
    '--acc': accent,
    '--accsoft': hexToRgba(accent, 0.12),
  };

  const selectedKey = toDateKey(selectedDate);
  const visibleTasks = tasks.filter((task) => getTaskMatchesDay(task, selectedDate));
  const selectedCount = visibleTasks.filter((task) => (done[selectedKey] || []).includes(task.id)).length;
  const percent = visibleTasks.length ? Math.round((selectedCount / visibleTasks.length) * 100) : 0;

  const openAddDialog = () => {
    setDialogMode('add');
    setEditingTask(null);
    setDraft({
      title: '',
      time: '08:00',
      cat: categories.find((category) => category.id !== 'all')?.id || 'health',
      days: [0, 1, 2, 3, 4, 5, 6],
      note: '',
    });
    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
    requestAnimationFrame(() => nameInputRef.current?.focus());
  };

  const openEditDialog = (task) => {
    setDialogMode('edit');
    setEditingTask(task);
    setDraft({
      title: task.title,
      time: task.time,
      cat: task.cat,
      days: task.days?.length ? task.days : [0, 1, 2, 3, 4, 5, 6],
      note: task.note || '',
    });
    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
    requestAnimationFrame(() => nameInputRef.current?.focus());
  };

  const closeDialog = () => {
    if (dialogRef.current && dialogRef.current.open) {
      dialogRef.current.close();
    }
  };

  const toggleDone = (taskId) => {
    const task = tasks.find((item) => item.id === taskId);
    const timeNow = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (toDateKey(selectedDate) === toDateKey(now) && task && task.time <= timeNow && (done[selectedKey] || []).some((id) => String(id) === String(taskId))) return;
    setDone((current) => {
      const existing = current[selectedKey] || [];
      const next = existing.includes(taskId)
        ? existing.filter((id) => id !== taskId)
        : [...existing, taskId];
      return { ...current, [selectedKey]: next };
    });
  };

  const handleSave = () => {
    const title = draft.title.trim();
    if (!title) {
      nameInputRef.current?.focus();
      return;
    }

    const nextTask = {
      id: editingTask?.id || `${Date.now()}`,
      title,
      time: draft.time || '08:00',
      cat: draft.cat || 'health',
      days: draft.days || [],
      note: draft.note?.trim() || '',
    };

    setTasks((current) => {
      if (editingTask) {
        return current.map((task) => (task.id === editingTask.id ? nextTask : task));
      }
      return [...current, nextTask];
    });

    closeDialog();
  };

  const handleDelete = () => {
    if (!editingTask) return;
    setTasks((current) => current.filter((task) => task.id !== editingTask.id));
    setDone((current) => {
      const nextState = { ...current };
      Object.keys(nextState).forEach((dateKey) => {
        nextState[dateKey] = (nextState[dateKey] || []).filter((taskId) => taskId !== editingTask.id);
      });
      return nextState;
    });
    closeDialog();
  };

  const duplicateRoutine = async (task) => {
    if (duplicateGuardRef.current.has(task.id)) return;
    duplicateGuardRef.current.add(task.id);
    try {
      const accepted = await confirm({
        title: 'Duplicate routine?',
        message: `Create a copy of “${task.title}” with the same schedule and category? The copy will start unchecked.`,
        confirmLabel: 'Duplicate',
        tone: 'default',
      });
      if (!accepted) return;
      const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setTasks((current) => [...current, {
        ...task,
        id,
        title: `${task.title} (copy)`,
        days: Array.isArray(task.days) ? [...task.days] : [],
      }]);
    } finally {
      window.setTimeout(() => duplicateGuardRef.current.delete(task.id), 400);
    }
  };

  const onAddCategory = (newCategory) => {
    const categoryId = newCategory.id || `custom-${Date.now()}`;
    setCategories((current) => {
      const alreadyExists = current.some((category) => category.id === categoryId);
      if (alreadyExists) return current;
      return [...current, { ...newCategory, id: categoryId }];
    });
    setSelectedCategory(categoryId);
    setDraft((current) => ({ ...current, cat: categoryId }));
  };

  const shiftDate = (offset) => {
    setSelectedDate((current) => addDays(current, offset));
  };

  return (
    <div className="routine-shell" style={routineShellStyle}>
      {preferenceError && <p role="alert" className="mx-4 mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{preferenceError}</p>}
      <div className="routine-layout">
        <aside className="routine-sidebar-stack">
          <HeaderCard selectedDate={selectedDate} tasks={tasks} done={done} />
          <WeekStrip selectedDate={selectedDate} tasks={tasks} done={done} onSelectDate={setSelectedDate} />
          <CategoryList
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            tasks={tasks}
            selectedDate={selectedDate}
            onAddCategory={onAddCategory}
          />
          <AppearanceSettings
            accent={accent}
            theme={theme}
            colorPalette={ACCENT_SWATCHES}
            onAccentChange={setAccent}
            onThemeChange={setTheme}
          />
        </aside>

        <main className="routine-main-panel">
          <div className="routine-main-header">
            <div className="routine-main-controls">
              <button type="button" className={`routine-segment${selectedDate.toDateString() === addDays(new Date(), -1).toDateString() ? ' is-selected' : ''}`} onClick={() => shiftDate(-1)}>Yesterday</button>
              <button type="button" className={`routine-segment${toDateKey(selectedDate) === toDateKey(new Date()) ? ' is-selected' : ''}`} onClick={() => setSelectedDate(new Date())}>Today</button>
              <button type="button" className={`routine-segment${selectedDate.toDateString() === addDays(new Date(), 1).toDateString() ? ' is-selected' : ''}`} onClick={() => shiftDate(1)}>Tomorrow</button>
            </div>
            <button type="button" className="routine-primary-button" onClick={openAddDialog}>+ Add routine</button>
          </div>

          <RoutineList
            tasks={tasks}
            categories={categories}
            selectedDate={selectedDate}
            categoryId={selectedCategory}
            done={done}
            now={now}
            onToggleDone={toggleDone}
            onDuplicate={duplicateRoutine}
            onOpenEditDialog={openEditDialog}
          />
        </main>
      </div>

      <RoutineDialog
        dialogRef={dialogRef}
        mode={dialogMode}
        draft={draft}
        setDraft={setDraft}
        onClose={closeDialog}
        onSave={handleSave}
        onDelete={handleDelete}
        nameInputRef={nameInputRef}
        categories={categories}
      />
    </div>
  );
}
