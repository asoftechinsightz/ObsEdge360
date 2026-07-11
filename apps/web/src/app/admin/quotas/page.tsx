'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function AdminQuotasPage() {
  const [evalData, setEvalData] = useState<Record<string, unknown> | null>(null);
  const [resourceKey, setResourceKey] = useState('configuration_items');
  const [soft, setSoft] = useState('100');
  const [hard, setHard] = useState('200');
  const [msg, setMsg] = useState('');

  const load = () =>
    apiClient<Record<string, unknown>>('/admin/quotas/evaluate').then(setEvalData);

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  async function save() {
    try {
      await apiClient(`/admin/quotas/${resourceKey}`, {
        method: 'PUT',
        body: JSON.stringify({ softLimit: Number(soft), hardLimit: Number(hard), warnPct: 80 }),
      });
      setMsg('Quota saved');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="Quota Management">
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          value={resourceKey}
          onChange={(e) => setResourceKey(e.target.value)}
        >
          {[
            'agents',
            'configuration_items',
            'dashboards',
            'ai_conversations',
            'rag_chunks',
            'kg_entities',
            'users',
            'discovery_jobs',
            'concurrent_users',
          ].map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <input className="w-24 rounded-md border border-slate-600 bg-slate-900 px-2 py-2 text-sm" value={soft} onChange={(e) => setSoft(e.target.value)} placeholder="soft" />
        <input className="w-24 rounded-md border border-slate-600 bg-slate-900 px-2 py-2 text-sm" value={hard} onChange={(e) => setHard(e.target.value)} placeholder="hard" />
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={save}>
          Save soft/hard
        </button>
      </div>
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(evalData, null, 2)}
      </pre>
    </AdminShell>
  );
}
