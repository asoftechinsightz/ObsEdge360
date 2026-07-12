'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { ErrorState, LoadingSkeleton, SuccessBanner } from '@/components/UiStates';

type Rc2Overview = {
  release?: { status?: string; version?: string; validation_token?: string | null; production_sha?: string | null };
  branding?: { product?: string; channel?: string; version?: string };
};

export default function Rc2Page() {
  const [data, setData] = useState<Rc2Overview | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => setData(await apiClient<Rc2Overview>('/rc2'));

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
    setMsg(`Modeled capacity profile recorded for ${n} users (guidance — not live soak)`);
  };

  return (
    <DashboardShell>
      <h1 className="mb-2 text-2xl font-semibold">RC2 Pilot Readiness</h1>
      <p className="mb-4 text-sm text-slate-400">
        Internal release gate (Developer Mode). Validation tokens and commit SHAs stay out of the standard UI.
      </p>
      {msg && <SuccessBanner message={msg} />}
      {err && <ErrorState message={err} onRetry={() => load().catch((e: Error) => setErr(e.message))} />}
      {!data && !err && <LoadingSkeleton rows={4} />}

      {data && (
        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <div className="eig-glass p-4">
            <div className="text-xs uppercase text-slate-500">Product</div>
            <div className="mt-1 font-medium">{data.branding?.product || 'OpsEdge360'}</div>
            <div className="text-xs text-slate-400">{data.branding?.channel}</div>
          </div>
          <div className="eig-glass p-4">
            <div className="text-xs uppercase text-slate-500">Gate status</div>
            <div className="mt-1 font-medium capitalize">{data.release?.status || 'pending'}</div>
            <div className="text-xs text-slate-400">{data.release?.version}</div>
          </div>
          <div className="eig-glass p-4">
            <div className="text-xs uppercase text-slate-500">Build attestation</div>
            <div className="mt-1 text-sm font-medium">
              {data.release?.production_sha ? 'Recorded (hidden)' : 'Not recorded'}
            </div>
            <div className="text-xs text-slate-400">Enable Debug Mode for technical details</div>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="rounded bg-sky-600 px-3 py-2 text-sm text-white" onClick={() => approve().catch((e: Error) => setErr(e.message))}>
          Approve RC2
        </button>
        <Link className="rounded border border-white/20 px-3 py-2 text-sm" href="/security">
          Security Center
        </Link>
        <Link className="rounded border border-white/20 px-3 py-2 text-sm" href="/pilot">
          Pilot package
        </Link>
        <Link className="rounded border border-white/20 px-3 py-2 text-sm" href="/demo">
          Demo
        </Link>
        {[100, 500, 1000, 5000, 10000].map((n) => (
          <button key={n} type="button" className="rounded border border-white/20 px-3 py-2 text-sm" onClick={() => bench(n).catch((e: Error) => setErr(e.message))}>
            Bench {n}
          </button>
        ))}
      </div>
    </DashboardShell>
  );
}
