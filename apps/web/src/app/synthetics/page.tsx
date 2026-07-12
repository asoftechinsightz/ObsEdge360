'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';

export default function SyntheticsPage() {
  const [data, setData] = useState<unknown>(null);
  const [msg, setMsg] = useState('');
  const [name, setName] = useState('API Health Check');
  const [target, setTarget] = useState('https://api.observability360.asoftechinsightz.com/api/v1/health');
  const [type, setType] = useState('http');

  const load = async () => {
    setData(await apiClient('/synthetics/monitors'));
  };

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  const create = async () => {
    setMsg('');
    await apiClient('/synthetics/monitors', {
      method: 'POST',
      body: JSON.stringify({
        name,
        monitorType: type,
        target,
        assertions: type === 'http' || type === 'rest' ? [{ type: 'status_code', equals: 200 }] : [],
        tags: ['phase2', 'synthetic'],
      }),
    });
    await load();
    setMsg('Monitor created');
  };

  const run = async (id: string) => {
    setMsg('');
    const r = (await apiClient(`/synthetics/monitors/${id}/run`, { method: 'POST', body: '{}' })) as {
      result?: { status?: string };
    };
    setMsg(`Run: ${JSON.stringify(r?.result?.status || r)}`);
    await load();
  };

  const monitors = (data as { monitors?: { id: string; name: string; monitor_type: string; target: string }[] })?.monitors || [];

  return (
    <DashboardShell>
      <h1 className="mb-2 text-2xl font-semibold text-white">Synthetic Monitoring</h1>
      <p className="mb-6 text-sm text-slate-400">
        Phase A — HTTP/REST, DNS, SSL expiry, and TCP port checks. Failures feed the alert engine.
      </p>
      {msg && <p className="mb-3 text-sm text-sky-200">{msg}</p>}
      <div className="mb-6 grid gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 md:grid-cols-4">
        <input className="rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        <select className="rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="http">HTTP</option>
          <option value="rest">REST</option>
          <option value="dns">DNS</option>
          <option value="ssl">SSL</option>
          <option value="tcp">TCP</option>
        </select>
        <input className="rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm md:col-span-2" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target URL or host:port" />
        <button type="button" className="rounded-md bg-sky-600 px-4 py-2 text-sm text-white md:col-span-4" onClick={() => create().catch((e: Error) => setMsg(e.message))}>
          Create monitor
        </button>
      </div>
      <div className="space-y-2">
        {monitors.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3">
            <div>
              <div className="font-medium text-white">{m.name}</div>
              <div className="text-xs text-slate-400">
                {m.monitor_type} · {m.target}
              </div>
            </div>
            <button type="button" className="rounded border border-slate-600 px-3 py-1 text-xs" onClick={() => run(m.id).catch((e: Error) => setMsg(e.message))}>
              Run now
            </button>
          </div>
        ))}
        {!monitors.length && <p className="text-sm text-slate-500">No monitors yet.</p>}
      </div>
    </DashboardShell>
  );
}
