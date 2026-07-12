'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { ErrorState, LoadingSkeleton, SuccessBanner } from '@/components/UiStates';

export default function Rc2Page() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => setData(await apiClient<Record<string, unknown>>('/rc2'));

  useEffect(() => {
    load().catch((e: Error) => setErr(e.message));
  }, []);

  const approve = async () => {
    await apiClient('/rc2/approve', {
      method: 'PUT',
      body: JSON.stringify({
        validationToken: 'RC2_PILOT_VALIDATION_OK',
        security: { ok: true },
        performance: { ok: true },
        auditSummary: { completed: true },
      }),
    });
    setMsg('RC2 approved');
    await load();
  };

  const bench = async (n: number) => {
    await apiClient('/performance/benchmarks', {
      method: 'POST',
      body: JSON.stringify({ concurrentUsers: n }),
    });
    setMsg(`Benchmark recorded for ${n} users`);
  };

  return (
    <DashboardShell>
      <h1 className="mb-2 text-2xl font-semibold">RC2 Pilot Readiness</h1>
      <p className="mb-4 text-sm text-slate-400">Customer pilot & enterprise production readiness gate.</p>
      {msg && <SuccessBanner message={msg} />}
      {err && <ErrorState message={err} onRetry={() => load().catch((e: Error) => setErr(e.message))} />}
      {!data && !err && <LoadingSkeleton rows={4} />}
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="rounded bg-sky-600 px-3 py-2 text-sm text-white" onClick={() => approve().catch((e: Error) => setErr(e.message))}>
          Approve RC2
        </button>
        {[100, 500, 1000, 5000, 10000].map((n) => (
          <button key={n} type="button" className="rounded border border-white/20 px-3 py-2 text-sm" onClick={() => bench(n).catch((e: Error) => setErr(e.message))}>
            Bench {n}
          </button>
        ))}
      </div>
      {data && <pre className="overflow-auto rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs">{JSON.stringify(data, null, 2)}</pre>}
    </DashboardShell>
  );
}
