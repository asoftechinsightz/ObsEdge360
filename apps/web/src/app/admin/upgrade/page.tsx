'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function AdminUpgradePage() {
  const [runs, setRuns] = useState<Array<Record<string, unknown>>>([]);
  const [msg, setMsg] = useState('');

  const load = () =>
    apiClient<{ runs: Array<Record<string, unknown>> }>('/admin/upgrades').then((d) => setRuns(d.runs));

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  async function record() {
    try {
      await apiClient('/admin/upgrades', {
        method: 'POST',
        body: JSON.stringify({
          fromVersion: 'v0.9.4-wave5',
          toVersion: 'v1.0.0-wave1',
          notes: 'Recorded upgrade; host uses scripts/upgrade-onprem.sh',
        }),
      });
      setMsg('Upgrade run recorded');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="Upgrade Manager">
      <p className="mb-3 text-sm text-slate-400">
        Use <code>scripts/upgrade-onprem.sh</code> on the host, then record the run here.
      </p>
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <button type="button" className="mb-4 rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={record}>
        Record upgrade
      </button>
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(runs, null, 2)}
      </pre>
    </AdminShell>
  );
}
