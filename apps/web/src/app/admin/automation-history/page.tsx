'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function AutomationHistoryPage() {
  const [q, setQ] = useState('');
  const [events, setEvents] = useState<Array<Record<string, unknown>>>([]);
  const [msg, setMsg] = useState('');

  const load = () => {
    const params = q ? `?q=${encodeURIComponent(q)}` : '';
    return apiClient<{ events: Array<Record<string, unknown>> }>(`/automation/history${params}`).then((d) =>
      setEvents(d.events),
    );
  };

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  function exportJson() {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `automation-history-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminShell title="Automation History">
      <p className="mb-3 text-sm text-slate-400">Searchable immutable history of executions, approvals, and e-stop events.</p>
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <div className="mb-4 flex gap-2">
        <input
          className="flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          placeholder="Search event type / detail"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" className="rounded-md border border-slate-600 px-3 py-2 text-sm" onClick={() => load()}>
          Search
        </button>
        <button type="button" className="rounded-md border border-slate-600 px-3 py-2 text-sm" onClick={exportJson}>
          Export JSON
        </button>
      </div>
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(events, null, 2)}
      </pre>
    </AdminShell>
  );
}
