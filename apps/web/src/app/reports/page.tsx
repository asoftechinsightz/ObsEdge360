'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/UiStates';
import { PageHeader, DataTable, JsonViewer, StatusBadge } from '@/components/eig/primitives';
import { isDebugMode } from '@/lib/debug-mode';
import { TrustBar } from '@/components/apex/TrustBar';
import { InlineAiAssist } from '@/components/apex/InlineAiAssist';
import { bump } from '@/lib/cvp/analytics';

function asRows(data: unknown): Array<Record<string, unknown>> {
  if (!data) return [];
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  if (typeof data === 'object') {
    const o = data as Record<string, unknown>;
    for (const key of ['items', 'reports', 'data', 'results']) {
      if (Array.isArray(o[key])) return o[key] as Array<Record<string, unknown>>;
    }
    return [o];
  }
  return [];
}

const TYPE_LABELS: Record<string, string> = {
  executive_summary: 'Executive summary',
  sla_compliance: 'SLA compliance',
  availability: 'Availability',
  incident_trends: 'Incident trends',
  mttr: 'MTTR',
  capacity: 'Capacity',
  synthetics: 'Synthetics',
  compliance: 'Compliance',
  audit: 'Audit',
};

export default function ReportsPage() {
  const [reports, setReports] = useState<unknown>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [type, setType] = useState('executive_summary');
  const [debug, setDebug] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      setReports(await apiClient('/reports'));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setDebug(isDebugMode());
    load();
  }, []);

  const rows = useMemo(() => asRows(reports), [reports]);

  const generate = async () => {
    await apiClient('/reports/generate', { method: 'POST', body: JSON.stringify({ reportType: type }) });
    bump('reportGenerations');
    setMsg(`${TYPE_LABELS[type] || type} generated`);
    await load();
  };

  return (
    <DashboardShell>
      <PageHeader
        title="Executive Reporting"
        purpose="Generate and review SLA, availability, incident, MTTR, synthetics, and compliance reports."
        actions={
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-[var(--eig-radius-sm)] border border-slate-600 bg-slate-950 px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
              aria-label="Report type"
            >
              {Object.entries(TYPE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="rounded-[var(--eig-radius-sm)] bg-sky-600 px-4 py-2 text-sm text-white"
              onClick={() => generate().catch((e: Error) => setErr(e.message))}
            >
              Generate
            </button>
          </div>
        }
      />
      {msg && <p className="mb-3 text-sm text-sky-200">{msg}</p>}
      <TrustBar
        lastUpdated={new Date()}
        freshness={loading ? 'unknown' : 'recent'}
        dataSource="Reporting APIs"
        coverageLabel="SLA · availability · incidents · MTTR · compliance"
        integrationHealth={err ? 'degraded' : 'healthy'}
      />
      <div className="mb-4">
        <InlineAiAssist
          title="Summarize latest reports for executives"
          prompt="Summarize the reporting posture for a CIO. Highlight SLA risk and recommended actions."
          context={typeof reports === 'object' ? JSON.stringify(reports).slice(0, 2000) : String(reports)}
        />
      </div>
      {err && <ErrorState message={err} onRetry={() => load()} />}
      {loading && <LoadingSkeleton rows={5} />}
      {!loading && !err && (
        <DataTable
          columns={[
            { key: 'name', label: 'Report', render: (r) => String(r.name ?? r.reportType ?? r.type ?? r.id ?? 'Report') },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={String(r.status ?? 'info')} /> },
            { key: 'createdAt', label: 'Created', render: (r) => String(r.createdAt ?? r.created_at ?? r.generatedAt ?? '—') },
            { key: 'format', label: 'Format', render: (r) => String(r.format ?? r.exportFormat ?? 'JSON/CSV') },
          ]}
          rows={rows}
          empty={<EmptyState title="No reports yet" hint="Choose a report type and click Generate." />}
        />
      )}
      {debug && reports != null && <JsonViewer data={reports} title="Reports API payload" />}
    </DashboardShell>
  );
}
