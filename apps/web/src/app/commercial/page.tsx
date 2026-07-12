'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/UiStates';

export default function CommercialPage() {
  const [data, setData] = useState<{ subscriptions?: unknown[] } | null>(null);
  const [ent, setEnt] = useState<Record<string, unknown> | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = async () => {
    setData(await apiClient<{ subscriptions?: unknown[] }>('/commercial'));
    setEnt(await apiClient<Record<string, unknown>>('/commercial/entitlements'));
  };

  useEffect(() => {
    load().catch((e: Error) => setErr(e.message));
  }, []);

  const trial = async () => {
    await apiClient('/commercial/trial', { method: 'POST', body: JSON.stringify({ days: 30, seats: 25 }) });
    setMsg('Trial activated');
    await load();
  };

  return (
    <DashboardShell>
      <h1 className="mb-2 text-2xl font-semibold">License & Subscription</h1>
      <p className="mb-4 text-sm text-slate-400">Commercial readiness — trials, entitlements, usage.</p>
      {msg && <p className="mb-2 text-sm text-sky-200">{msg}</p>}
      {err && <ErrorState message={err} onRetry={() => load().catch((e: Error) => setErr(e.message))} />}
      <button type="button" className="mb-4 rounded bg-sky-600 px-4 py-2 text-sm text-white" onClick={() => trial().catch((e: Error) => setErr(e.message))}>
        Activate 30-day trial
      </button>
      {!data && !err && <LoadingSkeleton rows={4} />}
      {data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <pre className="overflow-auto rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs">{JSON.stringify(data, null, 2)}</pre>
          <pre className="overflow-auto rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs">{JSON.stringify(ent, null, 2)}</pre>
        </div>
      )}
      {data && !(data.subscriptions?.length) && (
        <div className="mt-4">
          <EmptyState title="No active subscription" hint="Activate a trial or assign a license in Admin → Licenses." />
        </div>
      )}
    </DashboardShell>
  );
}
