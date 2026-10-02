'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LuCheck, LuClock3 } from 'react-icons/lu';
import {
  reminderSettingsUpdatedEvent,
  reminderTestNotificationEvent,
  reminderTestSoundEvent,
} from '@/lib/reminder-settings';
import { preferencesUpdatedEvent, readPreferences, writePreferences } from '@/lib/client-preferences';

const PRIORITY_RANK = { High: 3, Medium: 2, Low: 1 };

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function taskDateKey(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function isValidTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isDueWithinGracePeriod(time, now) {
  if (!isValidTime(time)) return false;
  const [hours, minutes] = time.split(':').map(Number);
  const scheduledAt = new Date(now);
  scheduledAt.setHours(hours, minutes, 0, 0);
  const elapsed = now.getTime() - scheduledAt.getTime();
  return elapsed >= 0 && elapsed < 5 * 60_000;
}

function reminderPriority(value) {
  return PRIORITY_RANK[value] ?? 2;
}

export default function ReminderManager({ userId }) {
  const settingsUpdatedEvent = reminderSettingsUpdatedEvent(userId);
  const testSoundEvent = reminderTestSoundEvent(userId);
  const testNotificationEvent = reminderTestNotificationEvent(userId);
  const [settings, setSettings] = useState(null);
  const [storageReady, setStorageReady] = useState(false);
  const [preferenceError, setPreferenceError] = useState('');
  const [todayTasks, setTodayTasks] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [routineDone, setRoutineDone] = useState({});
  const [routineAutoDone, setRoutineAutoDone] = useState({});
  const [activeReminder, setActiveReminder] = useState(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const audioContextRef = useRef(null);
  const soundNodesRef = useRef([]);
  const acknowledgedRef = useRef(new Set());
  const queueRef = useRef([]);
  const activeRef = useRef(null);
  const dataRef = useRef(null);
  dataRef.current = { settings, todayTasks, routines, routineDone, routineAutoDone };

  useEffect(() => {
    let mounted = true;
    readPreferences([
      'reminder-settings', 'reminder-acknowledged', 'routine-tasks', 'routine-done', 'routine-auto-done',
    ], {
      'reminder-settings': `xrynex-reminder-settings:${userId}`,
      'reminder-acknowledged': `xrynex-acknowledged-reminders:${userId}`,
      'routine-tasks': `xrynex-routine-tasks:${encodeURIComponent(userId || 'workspace')}`,
      'routine-done': `xrynex-routine-done:${encodeURIComponent(userId || 'workspace')}`,
      'routine-auto-done': `xrynex-routine-auto-done:${encodeURIComponent(userId || 'workspace')}`,
    }).then((saved) => {
      if (!mounted) return;
      setSettings(saved['reminder-settings'] || null);
      setRoutines(Array.isArray(saved['routine-tasks']) ? saved['routine-tasks'] : []);
      setRoutineDone(saved['routine-done'] || {});
      setRoutineAutoDone(saved['routine-auto-done'] || {});
      acknowledgedRef.current = new Set(Array.isArray(saved['reminder-acknowledged']) ? saved['reminder-acknowledged'] : []);
    }).catch((error) => {
      if (mounted) setPreferenceError(error.message);
    }).finally(() => {
      if (mounted) setStorageReady(true);
    });
    return () => { mounted = false; };
  }, [userId]);

  useEffect(() => {
    const reloadSettings = () => {
      readPreferences(['reminder-settings']).then((saved) => {
        setSettings(saved['reminder-settings'] || null);
        setPreferenceError('');
      }).catch((error) => setPreferenceError(error.message));
    };
    const runSoundTest = () => testSound();
    const runNotificationTest = () => testNotification();
    window.addEventListener(settingsUpdatedEvent, reloadSettings);
    window.addEventListener(testSoundEvent, runSoundTest);
    window.addEventListener(testNotificationEvent, runNotificationTest);
    return () => {
      window.removeEventListener(settingsUpdatedEvent, reloadSettings);
      window.removeEventListener(testSoundEvent, runSoundTest);
      window.removeEventListener(testNotificationEvent, runNotificationTest);
    };
  }, [settingsUpdatedEvent, testNotificationEvent, testSoundEvent]);

  useEffect(() => {
    if (!storageReady || !settings) return;
    writePreferences({ 'reminder-settings': settings })
      .then(() => setPreferenceError(''))
      .catch((error) => setPreferenceError(error.message));
  }, [settings, storageReady]);

  const refreshTasks = useCallback(async () => {
    const today = localDateKey(new Date());
    try {
      const response = await fetch(`/api/tasks?date=${today}`, { cache: 'no-store' });
      if (!response.ok) return;
      const rows = await response.json();
      if (Array.isArray(rows)) setTodayTasks(rows);
    } catch {
      // Keep the most recently fetched task schedule available while offline.
    }
  }, []);

  const refreshRoutines = useCallback(async () => {
    const saved = await readPreferences(['routine-tasks', 'routine-done', 'routine-auto-done']);
    setRoutines(Array.isArray(saved['routine-tasks']) ? saved['routine-tasks'] : []);
    setRoutineDone(saved['routine-done'] || {});
    setRoutineAutoDone(saved['routine-auto-done'] || {});
  }, []);

  useEffect(() => {
    refreshTasks();
    const taskTimer = window.setInterval(refreshTasks, 30_000);
    const onTaskUpdate = () => refreshTasks();
    const onPreferenceUpdate = (event) => {
      if (event.detail?.some((key) => ['routine-tasks', 'routine-done', 'routine-auto-done'].includes(key))) {
        refreshRoutines().catch((error) => setPreferenceError(error.message));
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshTasks();
        refreshRoutines();
      }
    };
    window.addEventListener('tasks-updated', onTaskUpdate);
    window.addEventListener(preferencesUpdatedEvent, onPreferenceUpdate);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(taskTimer);
      window.removeEventListener('tasks-updated', onTaskUpdate);
      window.removeEventListener(preferencesUpdatedEvent, onPreferenceUpdate);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refreshRoutines, refreshTasks]);

  const unlockAudio = useCallback(() => {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioContextRef.current ??= new AudioContextClass();
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const unlockOnInteraction = () => unlockAudio();
    window.addEventListener('pointerdown', unlockOnInteraction, { once: true, capture: true });
    window.addEventListener('keydown', unlockOnInteraction, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockOnInteraction, { capture: true });
      window.removeEventListener('keydown', unlockOnInteraction);
    };
  }, [unlockAudio]);

  const stopSound = useCallback(() => {
    for (const oscillator of soundNodesRef.current) {
      try { oscillator.stop(); } catch { /* An oscillator can already have stopped. */ }
    }
    soundNodesRef.current = [];
  }, []);

  const playSound = useCallback((tone, volume) => {
    if (!volume) return;
    unlockAudio();
    const context = audioContextRef.current;
    if (!context || context.state !== 'running') return;
    stopSound();

    const patterns = {
      chime: [784, 1046, 1318],
      double: [660, 660, 880],
      bell: [880, 1175, 1480],
    };
    const notes = patterns[tone] || patterns.chime;
    const startAt = context.currentTime;
    for (let burst = 0; burst < 5; burst += 1) {
      notes.forEach((frequency, index) => {
        const start = startAt + burst * 1.15 + index * 0.13;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = tone === 'bell' ? 'sine' : 'triangle';
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, (volume / 100) * 0.11), start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.65);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.68);
        soundNodesRef.current.push(oscillator);
      });
    }
  }, [stopSound, unlockAudio]);

  const advanceReminder = useCallback(() => {
    const completedReminder = activeRef.current;
    if (completedReminder && completedReminder.kind !== 'test') {
      acknowledgedRef.current.add(completedReminder.key);
      writePreferences({ 'reminder-acknowledged': [...acknowledgedRef.current] })
        .catch((error) => setPreferenceError(error.message));
      if (completedReminder.kind === 'task') {
        const taskId = completedReminder.key.split(':')[2];
        fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reminder_time: null }),
        }).then((response) => {
          if (response.ok) window.dispatchEvent(new Event('tasks-updated'));
        }).catch(() => {});
      }
    }
    stopSound();
    activeRef.current = null;
    const next = queueRef.current.shift() || null;
    setQueuedCount(queueRef.current.length);
    if (next) {
      activeRef.current = next;
      window.setTimeout(() => {
        setActiveReminder(next);
      }, 300);
    } else {
      setActiveReminder(null);
    }
  }, [stopSound]);

  const enqueueReminders = useCallback((reminders) => {
    if (!reminders.length) return;
    const queuedKeys = new Set(queueRef.current.map((item) => item.key));
    if (activeRef.current) queuedKeys.add(activeRef.current.key);
    const newItems = reminders.filter((item) => !queuedKeys.has(item.key));
    if (!newItems.length) return;

    const pending = [...queueRef.current, ...newItems].sort((a, b) => (
      reminderPriority(b.priority) - reminderPriority(a.priority)
      || a.dueAt - b.dueAt
      || a.title.localeCompare(b.title)
    ));
    if (!activeRef.current) {
      activeRef.current = pending.shift();
      setActiveReminder(activeRef.current);
    }
    queueRef.current = pending;
    setQueuedCount(pending.length);
  }, []);

  useEffect(() => {
    if (!storageReady) return undefined;
    const checkDue = () => {
      const now = new Date();
      const date = localDateKey(now);
      const { settings: currentSettings, todayTasks: tasks, routines: routineItems, routineDone: completed, routineAutoDone: automaticallyCompleted } = dataRef.current;
      if (!currentSettings?.enabled) return;

      const due = [];
      if (currentSettings.tasksEnabled) {
        for (const task of tasks) {
          if (task.done || task.removed_at || taskDateKey(task.task_date) !== date || !isDueWithinGracePeriod(task.reminder_time, now)) continue;
          due.push({
            key: `${date}:task:${task.id}:${task.reminder_time}`,
            kind: 'task',
            title: task.title,
            priority: task.priority || 'Medium',
            dueAt: now.getTime(),
            path: '/daily-tasks',
          });
        }
      }
      if (currentSettings.routinesEnabled) {
        const completedToday = completed[date] || [];
        const autoCompletedToday = automaticallyCompleted[date] || [];
        for (const routine of routineItems) {
          if (!isDueWithinGracePeriod(routine.time, now) || routine.days?.length && !routine.days.includes(now.getDay())) continue;
          const alreadyCompleted = completedToday.some((id) => String(id) === String(routine.id));
          const completedAutomatically = autoCompletedToday.some((id) => String(id) === String(routine.id));
          if (alreadyCompleted && !completedAutomatically) continue;
          due.push({
            key: `${date}:routine:${routine.id}:${routine.time}`,
            kind: 'routine',
            title: routine.title,
            priority: 'Medium',
            dueAt: now.getTime(),
            path: '/daily-routine',
          });
        }
      }

      const fresh = due.filter((item) => !acknowledgedRef.current.has(item.key));
      if (!fresh.length) return;
      enqueueReminders(fresh);
    };

    checkDue();
    const timer = window.setInterval(checkDue, 1_000);
    const checkWhenVisible = () => {
      if (document.visibilityState === 'visible') checkDue();
    };
    document.addEventListener('visibilitychange', checkWhenVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', checkWhenVisible);
    };
  }, [enqueueReminders, storageReady]);

  useEffect(() => {
    if (!activeReminder || !settings) return undefined;
    const focusTimer = window.setTimeout(() => document.querySelector('#scheduled-reminder-dismiss')?.focus(), 0);
    if (settings.keepPopupOpen) return () => window.clearTimeout(focusTimer);
    const timer = window.setTimeout(advanceReminder, Math.max(1, settings.popupSeconds) * 1_000);
    return () => {
      window.clearTimeout(focusTimer);
      window.clearTimeout(timer);
    };
  }, [activeReminder, advanceReminder, settings?.keepPopupOpen, settings?.popupSeconds]);

  useEffect(() => {
    if (!activeReminder || !settings || (!settings.enabled && !activeReminder.forceSound)) return undefined;
    playSound(settings.tone, settings.volume);
    return stopSound;
  }, [activeReminder, playSound, settings?.enabled, settings?.tone, settings?.volume, stopSound]);

  useEffect(() => {
    if (!settings || settings.keepPopupOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && activeRef.current) advanceReminder();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [advanceReminder, settings?.keepPopupOpen]);

  function testSound() {
    unlockAudio();
    window.setTimeout(() => {
      const currentSettings = dataRef.current.settings;
      if (!currentSettings) return;
      playSound(currentSettings.tone, currentSettings.volume);
    }, 80);
  }

  function testNotification() {
    unlockAudio();
    enqueueReminders([{
      key: `test:${Date.now()}`,
      kind: 'test',
      title: 'Sound reminder test',
      description: 'Your popup and selected alert sound are working. This is only a test.',
      priority: 'High',
      dueAt: Date.now(),
      path: '/daily-tasks',
      forceSound: true,
    }]);
  }

  return (
    <>
      {preferenceError && <div role="alert" className="fixed bottom-4 right-4 z-[90] rounded-lg border border-loss/30 bg-panel px-4 py-3 text-[12px] text-loss shadow-xl">{preferenceError}</div>}
      {activeReminder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" role="presentation">
          <section role="alertdialog" aria-modal="true" aria-labelledby="scheduled-reminder-title" aria-describedby="scheduled-reminder-copy" className="w-full max-w-xl rounded-3xl border border-win/40 bg-panel p-7 text-center shadow-2xl shadow-black/60 sm:p-10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-win/40 bg-win/10 text-3xl text-win"><LuClock3 aria-hidden="true" /></div>
            <p className="text-[11px] font-bold uppercase tracking-[.16em] text-win">{activeReminder.kind === 'test' ? 'Sound reminder test' : `${activeReminder.kind === 'task' ? 'Daily task' : 'Daily routine'} · ${activeReminder.priority} priority`}</p>
            <h2 id="scheduled-reminder-title" className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">{activeReminder.title}</h2>
            <p id="scheduled-reminder-copy" className="mx-auto mt-3 max-w-md text-[14px] leading-6 text-muted">{activeReminder.description || 'It is scheduled for now. Take a moment to complete it.'}</p>
            {queuedCount > 0 && <p className="mt-4 text-[12px] font-semibold text-win">{queuedCount} more reminder{queuedCount === 1 ? '' : 's'} queued by priority</p>}
            <p className="mt-4 text-[11px] text-muted">
              {settings.keepPopupOpen
                ? 'This reminder stays open until you tap Got it.'
                : `This reminder closes after ${settings.popupSeconds} second${settings.popupSeconds === 1 ? '' : 's'} or when you tap Got it.`}
            </p>
            <div className="mt-7 flex justify-center">
              <button id="scheduled-reminder-dismiss" type="button" className="btn btn-primary px-6" onClick={advanceReminder}><LuCheck className="mr-1 inline h-4 w-4" /> Got it</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
