'use client';

import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';

const DISMISSED_WEEK_STORAGE_KEY = 'weekly-calendar-reminder-dismissed-week';

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
  const [dismissedWeekStart, setDismissedWeekStart] = useState(null);
  const [dismissalLoaded, setDismissalLoaded] = useState(false);
  const [previewReminder, setPreviewReminder] = useState(false);

  useEffect(() => {
    try {
      const savedWeekStart = window.localStorage.getItem(DISMISSED_WEEK_STORAGE_KEY);
      if (savedWeekStart === String(mondaySixAm(new Date()).getTime())) {
        setDismissedWeekStart(Number(savedWeekStart));
      }
    } catch {}
    setDismissalLoaded(true);
    setPreviewReminder(
      process.env.NODE_ENV !== 'production'
      && new URLSearchParams(window.location.search).get('testCalendarReminder') === '1'
    );
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
  const showReminder = previewReminder || (now >= weekStart && (!updatedAt || new Date(updatedAt) < weekStart));
  if (!calendarLoaded || !dismissalLoaded || !showReminder || dismissedWeekStart === weekStart.getTime()) return null;

  return (
    <div role="alert" className="mb-3 flex items-center gap-3 rounded-xl border border-loss/50 bg-loss/15 px-4 py-3 text-[13px] font-medium text-loss">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-loss text-[11px]" aria-hidden>!</span>
      <span className="min-w-0 flex-1">Please update the economic calendar for this week.</span>
      <button
        type="button"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md transition hover:bg-loss/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-loss"
        aria-label="Dismiss economic calendar reminder"
        title="Dismiss reminder"
        onClick={() => {
          const dismissedWeek = weekStart.getTime();
          setDismissedWeekStart(dismissedWeek);
          try {
            window.localStorage.setItem(DISMISSED_WEEK_STORAGE_KEY, String(dismissedWeek));
          } catch {}
        }}
      >
        <FiX aria-hidden="true" />
      </button>
    </div>
  );
}