'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Empty } from '@/components/ui';
import { Modal } from '@/components/Form';
import SelectMenu from '@/components/SelectMenu';
import SectionHeader from '@/components/SectionHeader';
import { useConfirmDialog } from '@/components/ConfirmDialogProvider';
import { formatTime12Hour } from '@/lib/routine-data';

const tabs = ['Today', 'Pending', 'Upcoming', 'Completed', 'Removed'];
const priorities = ['High', 'Medium', 'Low'];
const priorityRank = { high: 0, medium: 1, low: 2 };

const priorityLabels = { High: 'High priority', Medium: 'Medium priority', Low: 'Low priority' };

function dateKey(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date(value).toISOString().slice(0, 10);
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function prettyDate(value) {
  if (!value) return 'No date';
  const [year, month, day] = dateKey(value).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function prettyDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function nextDayKey() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return localDateKey(tomorrow);
}

export default function DailyTaskManager({ tasks }) {
  const router = useRouter();
  const confirm = useConfirmDialog();
  const idPrefix = useId();
  const [items, setItems] = useState(tasks);
  const [activeTab, setActiveTab] = useState('Today');
  const [title, setTitle] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [taskAction, setTaskAction] = useState(null);
  const today = localDateKey(new Date());

  useEffect(() => setItems(tasks), [tasks]);

  const counts = useMemo(() => ({
    Today: items.filter((task) => !task.removed_at && dateKey(task.task_date) === today).length,
    Pending: items.filter((task) => !task.removed_at && !task.done && dateKey(task.task_date) < today).length,
    Upcoming: items.filter((task) => !task.removed_at && !task.done && dateKey(task.task_date) > today).length,
    Completed: items.filter((task) => !task.removed_at && task.done).length,
    Removed: items.filter((task) => Boolean(task.removed_at)).length,
  }), [items, today]);

  const visibleTasks = useMemo(() => {
    const filtered = items.filter((task) => {
      const taskDay = dateKey(task.task_date);
      if (activeTab === 'Today') return !task.removed_at && taskDay === today;
      if (activeTab === 'Pending') return !task.removed_at && !task.done && taskDay < today;
      if (activeTab === 'Upcoming') return !task.removed_at && !task.done && taskDay > today;
      if (activeTab === 'Completed') return !task.removed_at && task.done;
      if (activeTab === 'Removed') return Boolean(task.removed_at);
      return true;
    });
    return filtered.sort((a, b) => {
      if (activeTab === 'Today' || activeTab === 'Pending' || activeTab === 'Upcoming') {
        const priorityDifference = (priorityRank[String(a.priority || 'Medium').trim().toLowerCase()] ?? 1)
          - (priorityRank[String(b.priority || 'Medium').trim().toLowerCase()] ?? 1);
        if (priorityDifference) return priorityDifference;
      }
      return dateKey(b.task_date).localeCompare(dateKey(a.task_date)) || a.id - b.id;
    });
  }, [activeTab, items, today]);

  const groupedTasks = useMemo(() => {
    const groups = new Map();
    for (const task of visibleTasks) {
      const groupDate = activeTab === 'Completed'
        ? (task.completed_at ? localDateKey(new Date(task.completed_at)) : dateKey(task.task_date))
        : activeTab === 'Removed'
          ? (task.removed_at ? localDateKey(new Date(task.removed_at)) : dateKey(task.task_date))
          : dateKey(task.task_date);
      if (!groups.has(groupDate)) groups.set(groupDate, []);
      groups.get(groupDate).push(task);
    }
    return [...groups.entries()];
  }, [activeTab, visibleTasks]);

  async function updateTask(task, changes) {
    setError('');
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || 'Could not update this task.');
      return;
    }
    setItems((current) => current.map((item) => item.id === task.id ? result : item));
    window.dispatchEvent(new Event('tasks-updated'));
    router.refresh();
  }

  async function permanentlyDeleteTask(task, allowActive = false) {
    const accepted = await confirm({
      title: 'Delete task permanently?',
      message: `“${task.title}” will be permanently deleted and cannot be restored.`,
      confirmLabel: 'Delete permanently',
    });
    if (!accepted) return;

    setDeletingTaskId(task.id);
    setError('');
    try {
      const response = await fetch(`/api/tasks/${task.id}${allowActive ? '?permanent=true' : ''}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not permanently delete this task.');
      setItems((current) => current.filter((item) => item.id !== task.id));
      window.dispatchEvent(new Event('tasks-updated'));
      router.refresh();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingTaskId(null);
    }
  }

  async function addTask(event) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), priority, task_date: today, reminder_time: reminderTime || null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not add this task.');
      setItems((current) => [...current, result]);
      setTitle('');
      setReminderTime('');
      setPriority('Medium');
      setActiveTab('Today');
      window.dispatchEvent(new Event('tasks-updated'));
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function chooseTaskRemoval(action) {
    const task = taskAction;
    setTaskAction(null);
    if (!task) return;

    if (action === 'remove') {
      await updateTask(task, { removed: true });
      return;
    }
    if (action === 'delete') await permanentlyDeleteTask(task, true);
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Execute the plan"
        title="Daily tasks"
        icon="✅"
        description="Turn your trading process into a short, visible list of actions you can complete and review."
      />
      <section className="panel">
        <div className="panel-body">
      <div className="mb-4">
        <p className="text-[13px] leading-6 text-muted">
          Unfinished tasks move into Pending after their due date. Review them there and move any task you still plan to do back to today.
        </p>
      </div>

      <form onSubmit={addTask} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_130px_150px_auto]">
        <input
          className="field"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs to get done today?"
          aria-label="New daily task"
          maxLength={240}
        />
        <label className="sr-only" htmlFor="new-task-reminder-time">Reminder time</label>
        <input
          id="new-task-reminder-time"
          className="field"
          type="time"
          value={reminderTime}
          onChange={(event) => setReminderTime(event.target.value)}
          aria-label="Optional reminder time"
          title="Optional reminder time"
        />
        <SelectMenu
          value={priority}
          options={priorities}
          labels={priorityLabels}
          onChange={setPriority}
          label="Task priority"
          className="w-full"
        />
        <button className="btn btn-primary" type="submit" disabled={saving || !title.trim()}>
          {saving ? 'Adding…' : 'Add task'}
        </button>
      </form>

      {error && <p role="alert" className="mt-3 rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-[13px] text-loss">{error}</p>}

      <div role="tablist" aria-label="Daily task views" className="mt-5 flex gap-2 overflow-x-auto border-b border-line">
        {tabs.map((tab) => (
          <button
            key={tab}
            id={`${idPrefix}-tab-${tabs.indexOf(tab)}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`${idPrefix}-panel`}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 border-b-2 px-3 py-2 text-[13px] transition-colors ${activeTab === tab ? 'border-win text-white' : 'border-transparent text-muted hover:text-text'}`}
          >
            {tab}<span className="ml-2 rounded-full bg-panel2 px-2 py-0.5 text-[11px]">{counts[tab]}</span>
          </button>
        ))}
      </div>

      <div id={`${idPrefix}-panel`} role="tabpanel" aria-labelledby={`${idPrefix}-tab-${tabs.indexOf(activeTab)}`}>
        {groupedTasks.length ? (
          <div className="mt-3 space-y-5">
            {groupedTasks.map(([groupDate, grouped]) => (
              <section key={groupDate || 'undated'} aria-label={`${activeTab} tasks for ${prettyDate(groupDate)}`}>
                <h3 className="mb-1 border-b border-line pb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
                  {activeTab === 'Completed' ? 'Completed' : activeTab === 'Removed' ? 'Removed' : 'Tasks'} · {prettyDate(groupDate)}
                </h3>
                <ul className="divide-y divide-line">
            {grouped.map((task) => {
            const taskDay = dateKey(task.task_date);
              const isLate = !task.removed_at && !task.done && taskDay < today;
            return (
              <li key={task.id} className="daily-task-row flex flex-wrap items-center gap-3 py-3">
                {activeTab !== 'Pending' && activeTab !== 'Removed' && (
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={(event) => updateTask(task, {
                      done: event.target.checked,
                      ...(activeTab === 'Completed' && !event.target.checked ? { task_date: today } : {}),
                    })}
                    className="daily-task-check h-4 w-4 rounded border-line bg-ink accent-win"
                    aria-label={`${task.done ? 'Reopen' : 'Complete'} ${task.title}`}
                    disabled={Boolean(task.removed_at)}
                  />
                )}
                <div className="daily-task-copy min-w-0 flex-1">
                  <p className={`daily-task-title text-[13px] ${task.done ? 'text-muted line-through' : 'text-text'}`}>{task.title}</p>
                  <p className={`daily-task-meta mt-0.5 text-[11px] ${isLate ? 'text-loss' : 'text-muted'}`}>
                    {isLate ? `Overdue · ${prettyDate(task.task_date)}` : prettyDate(task.task_date)}
                    {task.reminder_time && ` · Reminder at ${formatTime12Hour(task.reminder_time)}`}
                  </p>
                    {task.completed_at && <p className="mt-0.5 text-[11px] text-win">Completed {prettyDateTime(task.completed_at)}</p>}
                    {task.removed_at && <p className="mt-0.5 text-[11px] text-loss">Removed {prettyDateTime(task.removed_at)}</p>}
                </div>
                <div className="daily-task-controls">
                  <span className={`daily-task-priority rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${task.priority === 'High' ? 'border-loss/30 bg-loss/10 text-loss' : task.priority === 'Low' ? 'border-line bg-panel2 text-muted' : 'border-gold/30 bg-gold/10 text-gold'}`}>
                    {task.priority || 'Medium'}
                  </span>
                {!task.removed_at && activeTab !== 'Completed' && (
                  <label className="daily-task-reminder flex items-center gap-1 text-[10px] text-muted" title="Set or clear this task reminder">
                    <span className="sr-only">Reminder time for {task.title}</span>
                    <input
                      key={`${task.id}-${task.reminder_time || ''}`}
                      type="time"
                      defaultValue={task.reminder_time || ''}
                      className="field w-[108px] px-2 py-1 text-[11px]"
                      aria-label={`Reminder time for ${task.title}`}
                      onBlur={(event) => {
                        const value = event.target.value || null;
                        if (value !== (task.reminder_time || null)) updateTask(task, { reminder_time: value });
                      }}
                    />
                  </label>
                )}
                {!task.removed_at && activeTab !== 'Completed' && (
                  <SelectMenu
                    value={task.priority || 'Medium'}
                    options={priorities}
                    onChange={(value) => updateTask(task, { priority: value })}
                    label={`Priority for ${task.title}`}
                    className="w-auto min-w-[96px] max-w-full"
                    buttonClassName="py-1 text-[12px]"
                  />
                )}
                {!task.removed_at && !task.done && activeTab === 'Pending' && (
                  <button type="button" className="btn btn-primary px-2 py-1 text-[11px]" onClick={() => updateTask(task, { task_date: today })}>
                    Move to today
                  </button>
                )}
                {!task.removed_at && !task.done && activeTab === 'Today' && taskDay === today && (
                  <button type="button" className="btn px-2 py-1 text-[11px]" onClick={() => updateTask(task, { task_date: nextDayKey() })}>
                    Move to tomorrow
                  </button>
                )}
                {task.removed_at ? (
                  <>
                    <button type="button" className="text-[12px] text-muted hover:text-win" onClick={() => updateTask(task, { removed: false })}>
                      Restore
                    </button>
                    <button
                      type="button"
                      className="text-[12px] text-muted hover:text-loss disabled:opacity-50"
                      disabled={deletingTaskId === task.id}
                      onClick={() => permanentlyDeleteTask(task)}
                    >
                      {deletingTaskId === task.id ? 'Deleting…' : 'Delete permanently'}
                    </button>
                  </>
                ) : activeTab !== 'Completed' && (
                  <button type="button" className="text-[12px] text-muted hover:text-loss" onClick={async () => {
                    if (activeTab === 'Today') {
                      setTaskAction(task);
                      return;
                    }
                    const accepted = await confirm({
                      title: 'Remove this task?',
                      message: `“${task.title}” will be moved to Removed. You can restore it later.`,
                      confirmLabel: 'Remove task',
                      tone: 'default',
                    });
                    if (accepted) updateTask(task, { removed: true });
                  }}>
                    Remove
                  </button>
                )}
                </div>
              </li>
            );
          })}
              </ul>
            </section>
          ))}
        </div>
        ) : (
          <Empty>{activeTab === 'Today' ? 'No tasks planned for today. Add one above.' : activeTab === 'Pending' ? 'No unfinished overdue tasks. You’re up to date.' : `No ${activeTab.toLowerCase()} tasks to show.`}</Empty>
        )}
      </div>
      <Modal
        open={Boolean(taskAction)}
        onClose={() => setTaskAction(null)}
        title="Remove task"
      >
        {taskAction && (
          <div className="space-y-4">
            <p className="text-[13px] leading-6 text-muted">
              Choose what to do with “{taskAction.title}”.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn" onClick={() => setTaskAction(null)}>
                Cancel
              </button>
              <button type="button" className="btn" onClick={() => chooseTaskRemoval('remove')}>
                Move to Removed
              </button>
              <button
                type="button"
                className="btn border-loss/40 bg-loss/15 text-loss hover:border-loss/60 hover:bg-loss/25"
                onClick={() => chooseTaskRemoval('delete')}
              >
                Delete permanently
              </button>
            </div>
          </div>
        )}
      </Modal>
        </div>
      </section>
    </div>
  );
}
