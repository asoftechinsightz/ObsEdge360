'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { forgotPasswordRequest } from '@/lib/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [message, setMessage] = useState('');
  const [devToken, setDevToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setDevToken('');
    setLoading(true);
    try {
      const result = await forgotPasswordRequest(email, tenantId || undefined);
      setMessage(result.message);
      if (result.resetToken) setDevToken(result.resetToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-surface-elevated p-8 shadow-xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-bold text-white">O</div>
          <div>
            <h1 className="text-lg font-semibold">Reset password</h1>
            <p className="text-sm text-slate-400">We will send reset instructions if your account exists</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              {message}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm text-slate-400" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400" htmlFor="org">Organization slug (optional)</label>
            <input
              id="org"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="acme"
              className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        {devToken && (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Dev mode: use this token on{' '}
            <Link href={`/reset-password?token=${devToken}`} className="text-primary underline">
              reset password
            </Link>
          </p>
        )}

        <p className="mt-6 text-center text-sm text-slate-400">
          <Link href="/login" className="text-primary hover:underline">← Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
