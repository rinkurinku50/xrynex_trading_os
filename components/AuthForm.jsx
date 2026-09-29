'use client';

import Link from 'next/link';
import { useState } from 'react';

function safeNext(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/';
  return value;
}

export default function AuthForm({ mode, next = '/', errorCode = '', signupEnabled = false }) {
  const isSignup = mode === 'signup';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(errorCode === 'sso' ? 'Single sign-on link expired or could not be verified. Please try again.' : '');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/auth/${isSignup ? 'signup' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Authentication failed.');
      window.location.assign(safeNext(next));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <section className="panel w-full max-w-md p-6 shadow-2xl shadow-black/20">
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-3 text-[13px] font-medium uppercase tracking-[0.16em] text-win">
          <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-line bg-black" aria-hidden="true">
            <img src="/xrynex-logo.png" alt="" className="h-full w-full object-contain" />
          </span>
          <span>Xrynex Trading OS</span>
        </div>
        <h1 className="text-2xl font-semibold text-white">{isSignup ? 'Create your account' : 'Welcome back'}</h1>
        <p className="mt-2 text-[13px] leading-5 text-muted">
          {isSignup ? 'Set up a secure account for your trading workspace.' : 'Sign in to continue to your trading workspace.'}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {isSignup && (
          <div>
            <label className="mb-1 block text-[13px] text-muted" htmlFor="name">Name <span className="text-muted/70">(optional)</span></label>
            <input id="name" className="field" autoComplete="name" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
          </div>
        )}
        <div>
          <label className="mb-1 block text-[13px] text-muted" htmlFor="email">Email</label>
          <input id="email" className="field" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-[13px] text-muted" htmlFor="password">Password</label>
          <input id="password" className="field" type="password" autoComplete={isSignup ? 'new-password' : 'current-password'} required minLength={isSignup ? 12 : 1} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} />
          {isSignup && <p className="mt-1 text-[11px] text-muted">Use at least 12 characters.</p>}
        </div>
        {error && <p role="alert" className="rounded-lg border border-loss/30 bg-loss/10 px-3 py-2 text-[13px] text-loss">{error}</p>}
        <button type="submit" className="btn btn-primary w-full py-2.5" disabled={busy}>
          {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}
        </button>
      </form>

      {isSignup ? (
        <p className="mt-5 text-center text-[13px] text-muted">
          Already have an account?{' '}
          <Link className="font-medium text-win hover:underline" href={`/login?next=${encodeURIComponent(safeNext(next))}`}>Log in</Link>
        </p>
      ) : signupEnabled ? (
        <p className="mt-5 text-center text-[13px] text-muted">
          New to Xrynex Trading OS?{' '}
          <Link className="font-medium text-win hover:underline" href={`/signup?next=${encodeURIComponent(safeNext(next))}`}>Create an account</Link>
        </p>
      ) : (
        <p className="mt-5 text-center text-[12px] leading-5 text-muted">Accounts are provisioned by your workspace administrator or the previous website’s secure sign-in.</p>
      )}
    </section>
  );
}
