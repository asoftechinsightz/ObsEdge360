'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';

export default function ItsmPage() {
  const [tab, setTab] = useState<'problems' | 'changes' | 'calendar' | 'knowledge' | 'catalog' | 'sla'>('problems');
  const [data, setData] = useState<unknown>(null);
  const [title, setTitle] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    const path =
      tab === 'problems'
        ? '/itsm/problems'
        : tab === 'changes'
          ? '/itsm/changes'
          : tab === 'calendar'
            ? '/itsm/calendar'
            : tab === 'knowledge'
              ? '/itsm/knowledge'
              : tab === 'catalog'
                ? '/itsm/catalog'
                : '/itsm/sla';
    setData(await apiClient(path));
  };

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, [tab]);

  const create = async () => {
    if (!title.trim()) return;
    if (tab === 'problems') await apiClient('/itsm/problems', { method: 'POST', body: JSON.stringify({ title }) });
    if (tab === 'changes') await apiClient('/itsm/changes', { method: 'POST', body: JSON.stringify({ title, cabRequired: true }) });
    if (tab === 'knowledge') await apiClient('/itsm/knowledge', { method: 'POST', body: JSON.stringify({ title, body: title, published: true }) });
    if (tab === 'sla') await apiClient('/itsm/sla', { method: 'POST', body: JSON.stringify({ name: title, targetPct: 99.9 }) });
    setTitle('');
    await load();
    setMsg('Created');
  };

  return (
    <DashboardShell>
      <h1 className="mb-2 text-2xl font-semibold">Enterprise ITSM</h1>
      <p className="mb-4 text-sm text-slate-400">Problems, changes, CAB, knowledge, catalog, and SLA — integrated with CMDB foundation.</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {(['problems', 'changes', 'calendar', 'knowledge', 'catalog', 'sla'] as const).map((t) => (
          <button key={t} type="button" className={`rounded px-3 py-1 text-xs ${tab === t ? 'bg-sky-700 text-white' : 'border border-slate-600 text-slate-300'}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {msg && <p className="mb-2 text-sm text-sky-200">{msg}</p>}
      {tab !== 'calendar' && tab !== 'catalog' && (
        <div className="mb-4 flex gap-2">
          <input className="flex-1 rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title / name" />
          <button type="button" className="rounded bg-sky-600 px-4 py-2 text-sm text-white" onClick={() => create().catch((e: Error) => setMsg(e.message))}>
            Create
          </button>
        </div>
      )}
      <pre className="overflow-auto rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs text-slate-300">{JSON.stringify(data, null, 2)}</pre>
    </DashboardShell>
  );
}
