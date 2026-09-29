'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { fmtDate } from '@/components/ui';

export default function TodayTasks({ tasks }) {
  const router = useRouter();
  const [items, setItems] = useState(tasks);
  const [, startTransition] = useTransition();
  useEffect(() => setItems(tasks), [tasks]);
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
      <ul className="divide-y divide-line">
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
                <span className="mt-0.5 block text-[11px] text-muted">{fmtDate(t.task_date)}</span>
              </span>
            </label>
            <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${t.priority === 'High' ? 'border-loss/30 bg-loss/10 text-loss' : t.priority === 'Low' ? 'border-line bg-panel2 text-muted' : 'border-gold/30 bg-gold/10 text-gold'}`}>
              {t.priority || 'Medium'}
            </span>
          </li>
        ))}
        {!items.length && <li className="text-[13px] text-muted">Nothing planned for today.</li>}
      </ul>
    </div>
  );
}
