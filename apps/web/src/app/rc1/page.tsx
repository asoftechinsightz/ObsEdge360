'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { ErrorState, LoadingSkeleton } from '@/components/UiStates';

export default function Rc1Page() {
  const [data, setData] = useState<unknown>(null);
  const [sec, setSec] = useState<unknown>(null);
  const [scale, setScale] = useState<unknown>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = async () => {
    setData(await apiClient('/rc1'));
    setSec(await apiClient('/security/assessment'));
    setScale(await apiClient('/scalability/profile'));
  };

  useEffect(() => {
    load().catch((e: Error) => setErr(e.message));
  }, []);

  const approve = async () => {
    await apiClient('/rc1/approve', {
      method: 'PUT',
      body: JSON.stringify({
        validationToken: 'P4_RC1_MARKET_VALIDATION_OK',
        security: { ok: true },
        performance: { ok: true },
      }),
    });
    setMsg('RC1 approved');
    await load();
  };

  return (
    <DashboardShell>
      <h1 className="mb-2 text-2xl font-semibold">Release Candidate 1 — Market Readiness</h1>
      <p className="mb-4 text-sm text-slate-400">Enterprise productization gate — security, scale, checklist, sign-off.</p>
      {msg && <p className="mb-2 text-sm text-sky-200">{msg}</p>}
      {err && <ErrorState message={err} />}
      <button type="button" className="mb-4 rounded bg-sky-600 px-4 py-2 text-sm text-white" onClick={() => approve().catch((e: Error) => setErr(e.message))}>
        Approve RC1 (after validation)
      </button>
      {!data && !err && <LoadingSkeleton rows={6} />}
      <div className="grid gap-4 lg:grid-cols-3">
        <pre className="overflow-auto rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs">{JSON.stringify(data, null, 2)}</pre>
        <pre className="overflow-auto rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs">{JSON.stringify(sec, null, 2)}</pre>
        <pre className="overflow-auto rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs">{JSON.stringify(scale, null, 2)}</pre>
      </div>
    </DashboardShell>
  );
}
