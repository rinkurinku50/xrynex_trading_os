'use client';

import { useState } from 'react';

export default function AccountMenu({ user, bankHolidayDate = null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function logout() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Could not log out. Please try again.');
      window.location.assign('/login');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <span className="max-w-[220px] truncate text-[12px] text-muted" title={user.email}>
          {user.name || user.email}
        </span>
        <button type="button" className="btn px-3 py-1.5 text-[12px]" onClick={logout} disabled={busy}>
          {busy ? 'Signing out…' : 'Log out'}
        </button>
        {bankHolidayDate && (
          <>
            <span className="h-7 w-px shrink-0 bg-amber-400/50" aria-hidden="true" />
            <span
              className="inline-flex shrink-0 items-center rounded-md border border-amber-400/40 bg-amber-400/10 px-2.5 py-1.5 text-[20px] font-semibold text-amber-300"
              title={`Bank holiday scheduled for ${new Date(`${bankHolidayDate}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`}
            >
              Bank Holiday — NO TRADE
            </span>
          </>
        )}
      </div>
      {error && <span role="alert" className="text-[12px] text-loss">{error}</span>}
    </div>
  );
}
