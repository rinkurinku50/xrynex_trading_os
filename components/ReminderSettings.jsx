'use client';

import { useEffect, useState } from 'react';
import { LuBellRing, LuVolume2 } from 'react-icons/lu';
import {
  reminderSettingsUpdatedEvent,
  reminderTestNotificationEvent,
  reminderTestSoundEvent,
} from '@/lib/reminder-settings';
import { readPreferences, writePreferences } from '@/lib/client-preferences';

function SettingsToggle({ checked, onChange, label }) {
  return (
    <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} aria-label={label} />
      <span aria-hidden="true" className="absolute inset-0 rounded-full border border-line bg-panel2 transition-colors peer-checked:border-win/60 peer-checked:bg-win/40 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-win" />
      <span aria-hidden="true" className="pointer-events-none absolute left-1 h-4 w-4 rounded-full bg-muted shadow transition-transform peer-checked:translate-x-5 peer-checked:bg-white" />
    </span>
  );
}

export default function ReminderSettings({ userId }) {
  const settingsEvent = reminderSettingsUpdatedEvent(userId);
  const [settings, setSettings] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    readPreferences(['reminder-settings'], {
      'reminder-settings': `xrynex-reminder-settings:${userId}`,
    }).then((saved) => {
      if (mounted) setSettings(saved['reminder-settings'] || null);
    }).catch((loadError) => {
      if (mounted) setError(loadError.message);
    }).finally(() => {
      if (mounted) setLoaded(true);
    });
    return () => { mounted = false; };
  }, [userId]);

  function updateSettings(changes) {
    if (!loaded || !settings) return;
    const next = { ...settings, ...changes };
    setSettings(next);
    writePreferences({ 'reminder-settings': next }).then(() => {
      setError('');
      window.dispatchEvent(new Event(settingsEvent));
    }).catch((saveError) => setError(saveError.message));
  }

  if (!loaded || !settings) {
    return <section className="panel"><div className="panel-body text-sm text-muted">Loading saved reminder settings…</div></section>;
  }

  return (
    <section className="panel" aria-labelledby="sound-reminders-title">
      <div className="panel-head">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-win/30 bg-win/10 text-win" aria-hidden="true">
            <LuBellRing className="h-5 w-5" />
          </span>
          <div>
            <h2 id="sound-reminders-title" className="text-[16px] font-semibold text-white">Sound reminders</h2>
            <p className="mt-1 text-[12px] text-muted">Choose what triggers an alert and how it sounds.</p>
          </div>
        </div>
      </div>
      {error && <p role="alert" className="border-b border-loss/20 bg-loss/10 px-4 py-2 text-[12px] text-loss">{error}</p>}
      <div className="panel-body space-y-5">
        <label className="flex items-center justify-between gap-4 rounded-xl border border-line bg-panel2/50 p-4">
          <span>
            <span className="block text-[13px] font-semibold text-text">Enable sound reminders</span>
            <span className="mt-1 block text-[11px] text-muted">Show timed alerts while Trading OS is open.</span>
          </span>
          <SettingsToggle checked={settings.enabled} onChange={(event) => updateSettings({ enabled: event.target.checked })} label="Enable sound reminders" />
        </label>

        <label className="flex items-center justify-between gap-4 rounded-xl border border-line p-4">
          <span>
            <span className="block text-[13px] font-semibold text-text">Keep popup open until Got it</span>
            <span className="mt-1 block text-[11px] text-muted">When off, reminders auto-close after the selected delay.</span>
          </span>
          <SettingsToggle checked={settings.keepPopupOpen} onChange={(event) => updateSettings({ keepPopupOpen: event.target.checked })} label="Keep reminder popup open until Got it" />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-line p-4 text-[13px] text-text">
            Daily tasks
            <SettingsToggle checked={settings.tasksEnabled} onChange={(event) => updateSettings({ tasksEnabled: event.target.checked })} label="Enable daily task reminders" />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-line p-4 text-[13px] text-text">
            Daily routines
            <SettingsToggle checked={settings.routinesEnabled} onChange={(event) => updateSettings({ routinesEnabled: event.target.checked })} label="Enable daily routine reminders" />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-[12px] font-semibold text-muted">
            Alert sound
            <select className="field mt-2 w-full" value={settings.tone} onChange={(event) => updateSettings({ tone: event.target.value })}>
              <option value="chime">Soft chime</option>
              <option value="double">Double tone</option>
              <option value="bell">Bright bell</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button type="button" className="btn btn-primary flex-1 px-3 py-2.5 text-[12px]" onClick={() => window.dispatchEvent(new Event(reminderTestSoundEvent(userId)))}>
              <LuVolume2 className="mr-1.5 inline h-4 w-4" /> Test sound
            </button>
            <button type="button" className="btn flex-1 border-win/40 px-3 py-2.5 text-[12px] text-win hover:border-win/70" onClick={() => window.dispatchEvent(new Event(reminderTestNotificationEvent(userId)))}>
              <LuBellRing className="mr-1.5 inline h-4 w-4" /> Test notification
            </button>
          </div>
        </div>

        <label className="block text-[12px] font-semibold text-muted">
          Volume · {settings.volume}%
          <input className="mt-2 w-full accent-win" type="range" min="0" max="100" value={settings.volume} onChange={(event) => updateSettings({ volume: Number(event.target.value) })} />
        </label>

        <label className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4 text-[13px] font-semibold text-text">
          <span>
            <span className="block">Popup duration</span>
            <span className="mt-1 block text-[11px] font-normal text-muted">Used when “Keep popup open until Got it” is off.</span>
          </span>
          <span className="flex items-center gap-2 text-[12px] text-muted">
            <input className="field w-24 px-2 py-2 text-center" type="number" min="1" max="60" value={settings.popupSeconds} onChange={(event) => updateSettings({ popupSeconds: Math.min(60, Math.max(1, Number(event.target.value) || 1)) })} aria-label="Popup duration in seconds" />
            seconds
          </span>
        </label>

        <p className="text-[11px] leading-5 text-muted">Keep the app open to receive reminders. Your browser needs a user interaction before it will play sound. A test notification previews the real popup without adding a reminder to your schedule.</p>
      </div>
    </section>
  );
}
