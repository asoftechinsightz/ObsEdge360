'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function AdminGovernancePage() {
  const [events, setEvents] = useState<unknown[]>([]);
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    Promise.all([
      apiClient<{ events: unknown[] }>('/admin/governance/audit'),
      apiClient<Record<string, unknown>>('/admin/platform-health'),
    ])
      .then(([a, h]) => {
        setEvents(a.events);
        setHealth(h);
      })
      .catch((e: Error) => setErr(e.message));
  }, []);
  return (
    <AdminShell title="Governance Reports">
      {err && <p className="text-sm text-red-400">{err}</p>}
      <h2 className="mb-2 font-medium">Platform health</h2>
      <pre className="mb-6 overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(health, null, 2)}
      </pre>
      <h2 className="mb-2 font-medium">Governance audit</h2>
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(events, null, 2)}
      </pre>
    </AdminShell>
  );
}
