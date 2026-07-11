'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function DeliveryHistoryPage() {
  const [deliveries, setDeliveries] = useState<Array<Record<string, unknown>>>([]);
  const [status, setStatus] = useState('');
  const [err, setErr] = useState('');
  const load = () => {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiClient<{ deliveries: Array<Record<string, unknown>> }>(`/integrations/notifications/deliveries${q}`).then((d) =>
      setDeliveries(d.deliveries),
    );
  };
  useEffect(() => {
    load().catch((e: Error) => setErr(e.message));
  }, []);
  return (
    <AdminShell title="Delivery History">
      {err && <p className="text-sm text-red-400">{err}</p>}
      <div className="mb-4 flex gap-2">
        <input className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm" placeholder="Filter status" value={status} onChange={(e) => setStatus(e.target.value)} />
        <button type="button" className="rounded-md border border-slate-600 px-3 py-2 text-sm" onClick={() => load()}>Refresh</button>
      </div>
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">{JSON.stringify(deliveries, null, 2)}</pre>
    </AdminShell>
  );
}
