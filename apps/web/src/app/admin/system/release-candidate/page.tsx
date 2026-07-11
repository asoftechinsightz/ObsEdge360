'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../../AdminShell';

const TABS = ['overview', 'docs', 'packaging', 'pilot', 'install', 'demo', 'readiness'] as const;

export default function ReleaseCandidatePage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('overview');
  const [data, setData] = useState<unknown>(null);
  const [msg, setMsg] = useState('');

  const load = async () => {
    if (tab === 'overview') setData(await apiClient('/admin/system/release-candidate'));
    else if (tab === 'docs') setData(await apiClient('/admin/system/release-candidate/docs-freeze'));
    else if (tab === 'packaging') setData(await apiClient('/admin/system/release-candidate/packaging'));
    else if (tab === 'pilot') setData(await apiClient('/admin/system/release-candidate/pilot'));
    else if (tab === 'install') setData(await apiClient('/admin/system/release-candidate/install'));
    else if (tab === 'demo') setData(await apiClient('/admin/system/release-candidate/demo'));
    else setData(await apiClient('/admin/system/release-candidate/readiness'));
  };

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function markValidated() {
    try {
      await apiClient('/admin/system/release-candidate/profile', {
        method: 'PUT',
        body: JSON.stringify({ status: 'pilot_ready', pilot: { ui: true } }),
      });
      setMsg('RC profile marked pilot_ready');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function seedDemo() {
    try {
      const demos = await apiClient<{ demos: Array<{ id: string }> }>('/admin/system/release-candidate/demo');
      const id = demos.demos[0]?.id;
      if (!id) throw new Error('No demo environment');
      await apiClient(`/admin/system/release-candidate/demo/${id}/seed`, { method: 'POST', body: '{}' });
      setMsg('Demo marked seeded — run scripts/demo-rc-seed.sh on host for data');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="Release Candidate">
      <p className="mb-3 text-sm text-slate-400">
        v1.0.0-rc1 — documentation freeze · packaging · pilot readiness. Not GA.
      </p>
      {msg && <p className="mb-3 text-sm text-slate-200">{msg}</p>}
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              tab === t
                ? 'rounded-lg bg-slate-100/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur'
                : 'rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800'
            }
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mb-4 flex gap-2">
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={markValidated}>
          Mark pilot ready
        </button>
        <button type="button" className="rounded-md border border-slate-600 px-4 py-2 text-sm" onClick={seedDemo}>
          Attest demo seed
        </button>
        <button type="button" className="rounded-md border border-slate-600 px-4 py-2 text-sm" onClick={() => load()}>
          Refresh
        </button>
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-xl backdrop-blur-md">
        <pre className="overflow-auto text-xs text-slate-300">{JSON.stringify(data, null, 2)}</pre>
      </div>
    </AdminShell>
  );
}
