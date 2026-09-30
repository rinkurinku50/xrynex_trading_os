'use client';

import { useState } from 'react';

export default function AccountMenu({ user }) {
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
      </div>
      {error && <span role="alert" className="text-[12px] text-loss">{error}</span>}
    </div>
  );
}
