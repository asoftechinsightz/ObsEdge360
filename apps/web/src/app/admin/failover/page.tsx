'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function AdminFailoverPage() {
  const [events, setEvents] = useState<unknown[]>([]);
  const [msg, setMsg] = useState('');

  const load = () =>
    apiClient<{ events: unknown[] }>('/admin/failover').then((d) => setEvents(d.events));

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  async function record() {
    try {
      await apiClient('/admin/failover', {
        method: 'POST',
        body: JSON.stringify({
          component: 'api-gateway',
          eventType: 'drill',
          fromNode: 'node-a',
          toNode: 'node-b',
          notes: 'Wave 2 failover drill (recorded)',
        }),
      });
      setMsg('Failover event recorded');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="Failover Events">
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <button type="button" className="mb-4 rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={record}>
        Record drill
      </button>
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(events, null, 2)}
      </pre>
    </AdminShell>
  );
}
