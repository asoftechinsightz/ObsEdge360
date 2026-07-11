'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function AdminUpgradeStatusPage() {
  const [checks, setChecks] = useState<unknown[]>([]);
  const [msg, setMsg] = useState('');

  const load = () =>
    apiClient<{ checks: unknown[] }>('/admin/upgrades/checks').then((d) => setChecks(d.checks));

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  async function precheck() {
    try {
      const r = await apiClient<{ passed: boolean }>('/admin/upgrades/precheck', {
        method: 'POST',
        body: JSON.stringify({ fromVersion: 'v1.0.0-wave1', toVersion: 'v1.0.0-wave2' }),
      });
      setMsg(r.passed ? 'Precheck passed' : 'Precheck failed');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="Upgrade Status">
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <button type="button" className="mb-4 rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={precheck}>
        Run precheck
      </button>
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(checks, null, 2)}
      </pre>
    </AdminShell>
  );
}
