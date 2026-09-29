'use client';

import { useEffect, useState } from 'react';

function mondaySixAm(date) {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setHours(6, 0, 0, 0);
  return monday;
}

export default function WeeklyCalendarReminder() {
  const [updatedAt, setUpdatedAt] = useState(null);
  const [calendarLoaded, setCalendarLoaded] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const load = () => fetch('/api/calendar-screenshot', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        setUpdatedAt(data?.updated_at || null);
        setCalendarLoaded(true);
      })
      .catch(() => {
        setUpdatedAt(null);
        setCalendarLoaded(false);
      });
    load();
    window.addEventListener('calendar-updated', load);
    const timer = window.setInterval(() => {
      setNow(new Date());
      load();
    }, 60 * 1000);
    return () => {
      window.removeEventListener('calendar-updated', load);
      window.clearInterval(timer);
    };
  }, []);

  const weekStart = mondaySixAm(now);
  const showReminder = now >= weekStart && (!updatedAt || new Date(updatedAt) < weekStart);
  if (!calendarLoaded || !showReminder) return null;

  return (
    <div role="alert" className="mb-3 flex items-center gap-3 rounded-xl border border-loss/50 bg-loss/15 px-4 py-3 text-[13px] font-medium text-loss">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-loss text-[11px]" aria-hidden>!</span>
      <span>Please update the economic calendar for this week.</span>
    </div>
  );
}