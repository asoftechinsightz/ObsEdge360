'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';

export default function ReportsPage() {
  const [reports, setReports] = useState<unknown>(null);
  const [msg, setMsg] = useState('');
  const [type, setType] = useState('executive_summary');

  const load = () => apiClient('/reports').then(setReports).catch((e: Error) => setMsg(e.message));

  useEffect(() => {
    load();
  }, []);

  const generate = async () => {
    await apiClient('/reports/generate', { method: 'POST', body: JSON.stringify({ reportType: type }) });
    setMsg('Report generated');
    await load();
  };

  return (
    <DashboardShell>
      <h1 className="mb-2 text-2xl font-semibold">Executive Reporting</h1>
      <p className="mb-4 text-sm text-slate-400">SLA, availability, incidents, MTTR, synthetics, compliance — JSON/CSV export.</p>
      {msg && <p className="mb-2 text-sm text-sky-200">{msg}</p>}
      <div className="mb-4 flex flex-wrap gap-2">
        <select className="rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
          {['executive_summary', 'sla_compliance', 'availability', 'incident_trends', 'mttr', 'capacity', 'synthetics', 'compliance', 'audit'].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button type="button" className="rounded bg-sky-600 px-4 py-2 text-sm text-white" onClick={() => generate().catch((e: Error) => setMsg(e.message))}>
          Generate
        </button>
      </div>
      <pre className="overflow-auto rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs">{JSON.stringify(reports, null, 2)}</pre>
    </DashboardShell>
  );
}
