'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { ErrorState, LoadingSkeleton } from '@/components/UiStates';
import { PageHeader, DataTable, JsonViewer, StatusBadge } from '@/components/eig/primitives';
import { isDebugMode } from '@/lib/debug-mode';
import { TrustBar } from '@/components/apex/TrustBar';
import { InlineAiAssist } from '@/components/apex/InlineAiAssist';
import { ExecutiveNarrative } from '@/components/apex/ExecutiveNarrative';
import { DemoAwareEmptyState } from '@/components/ede/DemoAwareEmptyState';
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

type ExportPayload = { format: string; filename: string; content: string | Record<string, unknown> };

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportsPageInner() {
  const search = useSearchParams();
  const [reports, setReports] = useState<unknown>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [type, setType] = useState('executive_summary');
  const [debug, setDebug] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const workflowRan = useMemo(() => ({ current: false }), []);

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

  const generate = async (reportType = type) => {
    setBusy(true);
    try {
      const row = await apiClient<{ id: string }>('/reports/generate', {
        method: 'POST',
        body: JSON.stringify({ reportType }),
      });
      bump('reportGenerations');
      setMsg(`${TYPE_LABELS[reportType] || reportType} generated`);
      await load();
      if (row?.id) {
        await exportReport(row.id, 'pdf');
      }
      return row;
    } finally {
      setBusy(false);
    }
  };

  const exportReport = async (id: string, format: 'csv' | 'json' | 'pdf' | 'xlsx') => {
    setBusy(true);
    try {
      const data = await apiClient<ExportPayload>(`/reports/${id}/export?format=${format}`);
      const content =
        typeof data.content === 'string' ? data.content : JSON.stringify(data.content, null, 2);
      const mime =
        format === 'csv' || format === 'xlsx'
          ? 'text/csv;charset=utf-8'
          : format === 'pdf'
            ? 'application/pdf'
            : 'application/json';
      downloadBlob(data.filename || `report.${format}`, content, mime);
      bump('reportGenerations');
      setMsg(`Downloaded ${data.filename || format}`);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    setDebug(isDebugMode());
    const wf = search.get('workflow');
    const t = search.get('type');
    if (t && TYPE_LABELS[t]) setType(t);
    void load().then(async () => {
      if (wf === 'generate' && !workflowRan.current) {
        workflowRan.current = true;
        try {
          await generate(t && TYPE_LABELS[t] ? t : 'executive_summary');
        } catch (e) {
          setErr(e instanceof Error ? e.message : 'Generate failed');
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const rows = useMemo(() => asRows(reports), [reports]);

  return (
    <DashboardShell>
      <PageHeader
        title="Executive Reporting"
        purpose="Board-ready dashboards — generate from live backend data and download PDF, Excel, CSV, or JSON."
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
              disabled={busy}
              className="rounded-[var(--eig-radius-sm)] bg-sky-600 px-4 py-2 text-sm text-white disabled:opacity-50"
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
        coverageLabel={`${rows.length} reports · PDF · Excel · CSV · JSON`}
        integrationHealth={err ? 'degraded' : 'healthy'}
      />
      <ExecutiveNarrative
        happening={rows.length ? `${rows.length} executive report(s) available for review` : 'No executive reports generated yet'}
        whyItMatters="QBR and board packs need a single narrative for availability, revenue-at-risk, and open risks."
        affectedService="CIO Office · Enterprise Operations"
        impact="Generate Executive summary, then export PDF/Excel/CSV for distribution."
        nextAction={{ label: 'Generate executive summary', href: '/reports?workflow=generate&type=executive_summary' }}
        aiConfidence={82}
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
            {
              key: 'name',
              label: 'Report',
              render: (r) => String(r.title ?? r.name ?? r.report_type ?? r.reportType ?? r.id ?? 'Report'),
            },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={String(r.status ?? 'ready')} /> },
            { key: 'createdAt', label: 'Created', render: (r) => String(r.createdAt ?? r.created_at ?? r.generatedAt ?? '—') },
            { key: 'format', label: 'Format', render: (r) => String(r.format ?? 'json') },
            {
              key: 'export',
              label: 'Export',
              render: (r) => {
                const id = String(r.id ?? '');
                if (!id) return '—';
                return (
                  <div className="flex flex-wrap gap-1">
                    {(['pdf', 'xlsx', 'csv', 'json'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        disabled={busy}
                        className="rounded border border-slate-600 px-2 py-0.5 text-[11px] uppercase text-slate-300 hover:border-sky-500/40 disabled:opacity-50"
                        onClick={() => exportReport(id, fmt).catch((e: Error) => setErr(e.message))}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                );
              },
            },
          ]}
          rows={rows}
          empty={
            <DemoAwareEmptyState
              title="No reports yet"
              hint="Generate an Executive summary for a board-ready brief with KPIs, risks, and recommended actions."
              setupHref="/demo/guided"
              showLoadDemo={false}
            />
          }
        />
      )}
      {debug && reports != null && <JsonViewer data={reports} title="Reports API payload" />}
    </DashboardShell>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<DashboardShell><LoadingSkeleton rows={5} /></DashboardShell>}>
      <ReportsPageInner />
    </Suspense>
  );
}
