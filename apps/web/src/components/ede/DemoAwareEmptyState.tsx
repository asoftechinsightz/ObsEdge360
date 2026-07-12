'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { EmptyState } from '@/components/UiStates';

type Props = {
  title: string;
  hint?: string;
  showLoadDemo?: boolean;
  docsHref?: string;
  setupHref?: string;
};

/** Empty business surface with demo pack + setup CTAs (never a blank dead-end). */
export function DemoAwareEmptyState({
  title,
  hint,
  showLoadDemo = true,
  docsHref = '/help',
  setupHref = '/discovery',
}: Props) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const loadDemo = async () => {
    setBusy(true);
    setMsg('');
    try {
      await apiClient('/demo/ede/load', { method: 'POST', body: JSON.stringify({}) });
      setMsg('Enterprise Demo pack loaded. Refresh this page.');
      window.setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Unable to load demo pack (admin role required).');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <EmptyState title={title} hint={hint} />
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
        {showLoadDemo && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void loadDemo()}
            className="rounded-[var(--eig-radius-sm)] bg-sky-600 px-3 py-2 text-white disabled:opacity-50"
          >
            {busy ? 'Loading demo…' : 'Load Illustrative Demo Data'}
          </button>
        )}
        <Link href={setupHref} className="rounded border border-white/20 px-3 py-2 text-slate-200">
          Guided setup
        </Link>
        <Link href={docsHref} className="rounded border border-white/20 px-3 py-2 text-slate-200">
          Documentation
        </Link>
        <Link href="/demo/guided" className="rounded border border-violet-500/40 px-3 py-2 text-violet-100">
          15-min evaluation
        </Link>
      </div>
      {msg && <p className="text-center text-xs text-slate-400">{msg}</p>}
    </div>
  );
}
