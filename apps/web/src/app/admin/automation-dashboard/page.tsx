'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function AutomationDashboardPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    apiClient<Record<string, unknown>>('/automation/dashboard')
      .then(setData)
      .catch((e: Error) => setErr(e.message));
  }, []);
  const control = (data?.control ?? {}) as Record<string, unknown>;
  const counts = (data?.counts ?? {}) as Record<string, unknown>;
  return (
    <AdminShell title="Automation Dashboard">
      <p className="mb-3 text-sm text-slate-400">
        Controlled automation — no fully autonomous production execution. Wave {String(data?.wave ?? '…')}.
      </p>
      {err && <p className="mb-3 text-sm text-red-400">{err}</p>}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['E-Stop', control.emergencyStop ? 'ACTIVE' : 'clear'],
          ['Paused', control.paused ? 'yes' : 'no'],
          ['Workflows', counts.workflows],
          ['Pending approvals', counts.pendingApprovals],
        ].map(([k, v]) => (
          <div key={String(k)} className="rounded-xl border border-slate-700 bg-surface-elevated px-4 py-3">
            <div className="text-xs text-slate-400">{String(k)}</div>
            <div className="text-lg font-medium text-slate-100">{String(v ?? '—')}</div>
          </div>
        ))}
      </div>
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </AdminShell>
  );
}
