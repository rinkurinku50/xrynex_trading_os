'use client';

import { useEffect, useState } from 'react';

export default function AdminSettings() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load admin settings.');
        setStatus(result);
      })
      .catch((err) => setError(err.message));
  }, []);

  async function toggleSignup() {
    if (!status) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !status.enabled }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update signup settings.');
      setStatus(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel max-w-3xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-win">Workspace controls</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Public signup</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Control whether new users can create accounts from the login screen. Existing accounts and legacy SSO are unaffected.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-line bg-black/10 px-4 py-3">
          <span className={`h-2.5 w-2.5 rounded-full ${status?.enabled ? 'bg-win' : 'bg-muted'}`} aria-hidden="true" />
          <span className="min-w-14 text-sm font-medium text-white">{status ? (status.enabled ? 'Enabled' : 'Disabled') : 'Loading'}</span>
          <button
            type="button"
            role="switch"
            aria-label="Enable public signup"
            aria-checked={Boolean(status?.enabled)}
            disabled={!status || busy || (!status.enabled && !status.canEnable)}
            onClick={toggleSignup}
            className={`relative h-7 w-12 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${status?.enabled ? 'bg-win' : 'bg-line'}`}
          >
            <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${status?.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>
      {!status?.canEnable && (
        <p className="mt-4 rounded-lg border border-loss/30 bg-loss/10 px-3 py-2 text-[12px] leading-5 text-loss">
          Public signup is blocked in production until EMAIL_VERIFICATION_ENABLED=true. Only enable it after a verified email flow is configured.
        </p>
      )}
      {error && <p role="alert" className="mt-4 rounded-lg border border-loss/30 bg-loss/10 px-3 py-2 text-[13px] text-loss">{error}</p>}
      <p className="mt-4 text-[11px] text-muted">This setting is saved to the application database and applies to the signup page and signup API.</p>
    </section>
  );
}
