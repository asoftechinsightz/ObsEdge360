'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function AdminAuditPage() {
  const [events, setEvents] = useState<Array<Record<string, unknown>>>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    apiClient<{ events: Array<Record<string, unknown>> }>('/admin/audit?limit=50')
      .then((d) => setEvents(d.events))
      .catch((e: Error) => setErr(e.message));
  }, []);

  return (
    <AdminShell title="Audit Console">
      {err && <p className="text-sm text-red-400">{err}</p>}
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(events, null, 2)}
      </pre>
    </AdminShell>
  );
}
