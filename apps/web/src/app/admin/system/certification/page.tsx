'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../../AdminShell';

const PAGES = ['performance', 'load', 'ha', 'chaos', 'security', 'reliability', 'reports'] as const;

export default function CertificationCenterPage() {
  const [tab, setTab] = useState<(typeof PAGES)[number]>('performance');
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [runs, setRuns] = useState<unknown[]>([]);
  const [extra, setExtra] = useState<unknown>(null);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const o = await apiClient<Record<string, unknown>>('/admin/system/certification');
    setOverview(o);
    const r = await apiClient<{ runs: unknown[] }>(`/admin/system/certification/runs?suite=${tab === 'reports' ? '' : tab}`);
    setRuns(r.runs);
    if (tab === 'security') setExtra(await apiClient('/admin/system/certification/security-matrix'));
    else if (tab === 'reports') setExtra(await apiClient('/admin/system/certification/reports'));
    else if (tab === 'performance' || tab === 'load') setExtra(await apiClient('/admin/system/certification/scalability'));
    else if (tab === 'ha' || tab === 'chaos') setExtra(await apiClient('/admin/system/certification/operational'));
    else if (tab === 'reliability') setExtra(await apiClient('/admin/system/certification/operational'));
    else setExtra(null);
  };

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function startSuite() {
    try {
      const suiteKey = tab === 'reports' ? 'reports' : tab;
      await apiClient('/admin/system/certification/runs', {
        method: 'POST',
        body: JSON.stringify({ suiteKey, notes: `UI start ${suiteKey}` }),
      });
      setMsg(`Started ${suiteKey} run — execute host scripts/wave7-certify.mjs to populate measurements`);
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="Certification Center">
      <p className="mb-3 text-sm text-slate-400">
        Enterprise certification for Waves 1–6 — Wave {String(overview?.wave ?? '7')}. Real runs · reports · no GA claim.
      </p>
      {msg && <p className="mb-3 text-sm text-slate-200">{msg}</p>}
      <div className="mb-4 flex flex-wrap gap-2">
        {PAGES.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setTab(p)}
            className={
              tab === p
                ? 'rounded-lg bg-slate-100/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur'
                : 'rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }
          >
            {p}
          </button>
        ))}
      </div>
      <div className="mb-4 flex gap-2">
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={startSuite}>
          Start {tab} run
        </button>
        <button type="button" className="rounded-md border border-slate-600 px-4 py-2 text-sm" onClick={() => load()}>
          Refresh
        </button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-xl backdrop-blur-md">
          <h2 className="mb-2 text-sm font-medium text-slate-200">Overview / inventory</h2>
          <pre className="overflow-auto text-xs text-slate-300">
            {JSON.stringify(
              {
                wave: overview?.wave,
                gaClaim: overview?.gaClaim,
                inventory: overview?.inventory,
                latestBySuite: overview?.latestBySuite,
              },
              null,
              2,
            )}
          </pre>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-xl backdrop-blur-md">
          <h2 className="mb-2 text-sm font-medium text-slate-200">{tab} context</h2>
          <pre className="overflow-auto text-xs text-slate-300">{JSON.stringify(extra, null, 2)}</pre>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-xl backdrop-blur-md">
        <h2 className="mb-2 text-sm font-medium text-slate-200">Runs</h2>
        <pre className="overflow-auto text-xs text-slate-300">{JSON.stringify(runs, null, 2)}</pre>
      </div>
    </AdminShell>
  );
}
