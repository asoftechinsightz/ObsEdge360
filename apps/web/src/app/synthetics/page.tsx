'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';

export default function SyntheticsPage() {
  const [mode, setMode] = useState<'http' | 'browser'>('http');
  const [data, setData] = useState<unknown>(null);
  const [journeys, setJourneys] = useState<unknown>(null);
  const [msg, setMsg] = useState('');
  const [name, setName] = useState('API Health Check');
  const [target, setTarget] = useState('https://api.observability360.asoftechinsightz.com/api/v1/health');
  const [type, setType] = useState('http');

  const load = async () => {
    if (mode === 'http') setData(await apiClient('/synthetics/monitors'));
    else setJourneys(await apiClient('/synthetics/browser/journeys'));
  };

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, [mode]);

  const createHttp = async () => {
    await apiClient('/synthetics/monitors', {
      method: 'POST',
      body: JSON.stringify({
        name,
        monitorType: type,
        target,
        assertions: type === 'http' || type === 'rest' ? [{ type: 'status_code', equals: 200 }] : [],
        tags: ['phase3', 'synthetic'],
      }),
    });
    await load();
    setMsg('HTTP monitor created');
  };

  const createBrowser = async () => {
    await apiClient('/synthetics/browser/journeys', {
      method: 'POST',
      body: JSON.stringify({
        name: name || 'Login journey',
        baseUrl: target,
        steps: [
          { action: 'goto', url: target },
          { action: 'wait', selector: 'body' },
          { action: 'assert_visible', selector: 'body' },
        ],
      }),
    });
    await load();
    setMsg('Browser journey created');
  };

  const runHttp = async (id: string) => {
    const r = (await apiClient(`/synthetics/monitors/${id}/run`, { method: 'POST', body: '{}' })) as { result?: { status?: string } };
    setMsg(`Run: ${r?.result?.status}`);
    await load();
  };

  const runBrowser = async (id: string) => {
    const r = (await apiClient(`/synthetics/browser/journeys/${id}/run`, { method: 'POST', body: '{}' })) as {
      run?: { status?: string };
      mode?: string;
    };
    setMsg(`Browser run: ${r?.run?.status} (${r?.mode})`);
    await load();
  };

  const monitors = (data as { monitors?: { id: string; name: string; monitor_type: string; target: string }[] })?.monitors || [];
  const journeyList = (journeys as { journeys?: { id: string; name: string; base_url: string }[] })?.journeys || [];

  return (
    <DashboardShell>
      <h1 className="mb-2 text-2xl font-semibold text-white">Synthetic Monitoring</h1>
      <p className="mb-4 text-sm text-slate-400">Phase A HTTP/DNS/SSL/TCP · Phase B browser journeys (navigation probe + step waterfall).</p>
      <div className="mb-4 flex gap-2">
        <button type="button" className={`rounded px-3 py-1 text-xs ${mode === 'http' ? 'bg-sky-700' : 'border border-slate-600'}`} onClick={() => setMode('http')}>
          HTTP / API
        </button>
        <button type="button" className={`rounded px-3 py-1 text-xs ${mode === 'browser' ? 'bg-sky-700' : 'border border-slate-600'}`} onClick={() => setMode('browser')}>
          Browser journeys
        </button>
      </div>
      {msg && <p className="mb-3 text-sm text-sky-200">{msg}</p>}
      <div className="mb-6 grid gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 md:grid-cols-4">
        <input className="rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        {mode === 'http' ? (
          <select className="rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="http">HTTP</option>
            <option value="rest">REST</option>
            <option value="dns">DNS</option>
            <option value="ssl">SSL</option>
            <option value="tcp">TCP</option>
          </select>
        ) : (
          <div className="rounded border border-slate-700 px-3 py-2 text-sm text-slate-400">browser</div>
        )}
        <input className="rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm md:col-span-2" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="URL / host" />
        <button
          type="button"
          className="rounded-md bg-sky-600 px-4 py-2 text-sm text-white md:col-span-4"
          onClick={() => (mode === 'http' ? createHttp() : createBrowser()).catch((e: Error) => setMsg(e.message))}
        >
          Create {mode === 'http' ? 'monitor' : 'journey'}
        </button>
      </div>
      <div className="space-y-2">
        {mode === 'http' &&
          monitors.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3">
              <div>
                <div className="font-medium text-white">{m.name}</div>
                <div className="text-xs text-slate-400">
                  {m.monitor_type} · {m.target}
                </div>
              </div>
              <button type="button" className="rounded border border-slate-600 px-3 py-1 text-xs" onClick={() => runHttp(m.id).catch((e: Error) => setMsg(e.message))}>
                Run now
              </button>
            </div>
          ))}
        {mode === 'browser' &&
          journeyList.map((j) => (
            <div key={j.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3">
              <div>
                <div className="font-medium text-white">{j.name}</div>
                <div className="text-xs text-slate-400">{j.base_url}</div>
              </div>
              <button type="button" className="rounded border border-slate-600 px-3 py-1 text-xs" onClick={() => runBrowser(j.id).catch((e: Error) => setMsg(e.message))}>
                Run journey
              </button>
            </div>
          ))}
      </div>
    </DashboardShell>
  );
}
