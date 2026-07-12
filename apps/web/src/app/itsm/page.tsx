'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { EmptyState, ErrorState, LoadingSkeleton, SuccessBanner } from '@/components/UiStates';
import { PageHeader, DataTable, JsonViewer, StatusBadge } from '@/components/eig/primitives';
import { isDebugMode } from '@/lib/debug-mode';
import { TrustBar } from '@/components/apex/TrustBar';
import { ExecutiveNarrative } from '@/components/apex/ExecutiveNarrative';
import { DemoAwareEmptyState } from '@/components/ede/DemoAwareEmptyState';
import { friendlyError } from '@/lib/friendly-error';

function asRows(data: unknown): Array<Record<string, unknown>> {
  if (!data) return [];
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  if (typeof data === 'object') {
    const o = data as Record<string, unknown>;
    for (const key of ['items', 'problems', 'changes', 'knowledge', 'catalog', 'sla', 'events', 'data', 'results']) {
      if (Array.isArray(o[key])) return o[key] as Array<Record<string, unknown>>;
    }
  }
  return [];
}

export default function ItsmPage() {
  const [tab, setTab] = useState<'problems' | 'changes' | 'calendar' | 'knowledge' | 'catalog' | 'sla'>('problems');
  const [data, setData] = useState<unknown>(null);
  const [title, setTitle] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [debug, setDebug] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
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
    } catch (e) {
      setErr(friendlyError(e, 'ITSM records are unavailable. Load Illustrative Demo Data to evaluate problems, changes, and CAB.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setDebug(isDebugMode());
    load();
  }, [tab]);

  const rows = useMemo(() => asRows(data), [data]);

  const create = async () => {
    if (!title.trim()) return;
    if (tab === 'problems') await apiClient('/itsm/problems', { method: 'POST', body: JSON.stringify({ title }) });
    if (tab === 'changes') await apiClient('/itsm/changes', { method: 'POST', body: JSON.stringify({ title, cabRequired: true }) });
    if (tab === 'knowledge') await apiClient('/itsm/knowledge', { method: 'POST', body: JSON.stringify({ title, body: title, published: true }) });
    if (tab === 'sla') await apiClient('/itsm/sla', { method: 'POST', body: JSON.stringify({ name: title, targetPct: 99.9 }) });
    setTitle('');
    setMsg('Created');
    await load();
  };

  return (
    <DashboardShell>
      <PageHeader
        title="Enterprise ITSM"
        purpose="Problems, changes, CAB, knowledge, and SLA — with owners, business impact, and next approval steps."
      />
      <TrustBar
        lastUpdated={new Date()}
        freshness={loading ? 'unknown' : 'recent'}
        dataSource="ITSM APIs"
        coverageLabel={`${rows.length} ${tab} records`}
        integrationHealth={err ? 'degraded' : 'healthy'}
      />
      <ExecutiveNarrative
        happening={rows.length ? `${rows.length} open ${tab} record(s) in the evaluation estate` : `No ${tab} records yet`}
        whyItMatters="Change and problem velocity without ownership creates CAB risk and prolongs revenue-impacting incidents."
        affectedService="ITSM · Platform Reliability · Security Operations"
        impact="Review high-priority problems and pending CAB changes before peak payment windows."
        nextAction={{ label: 'Open CMDB Drift for related change risk', href: '/cmdb/drift' }}
        aiConfidence={80}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {(['problems', 'changes', 'calendar', 'knowledge', 'catalog', 'sla'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`rounded-[var(--eig-radius-sm)] px-3 py-1.5 text-xs capitalize ${tab === t ? 'bg-sky-700 text-white' : 'border border-slate-600 text-slate-300'}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {msg && <SuccessBanner message={msg} />}
      {err && <ErrorState message={err} onRetry={() => load()} />}
      {tab !== 'calendar' && tab !== 'catalog' && (
        <div className="mb-4 flex gap-2">
          <input
            className="flex-1 rounded-[var(--eig-radius-sm)] border border-slate-600 bg-slate-950 px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title / name"
            aria-label="New item title"
          />
          <button
            type="button"
            className="rounded-[var(--eig-radius-sm)] bg-sky-600 px-4 py-2 text-sm text-white"
            onClick={() => create().catch((e: Error) => setErr(e.message))}
          >
            Create
          </button>
        </div>
      )}
      {loading && <LoadingSkeleton rows={5} />}
      {!loading && !err && (
        <DataTable
          columns={[
            { key: 'title', label: 'Item', render: (r) => String(r.title ?? r.name ?? r.summary ?? r.id ?? 'Item') },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={String(r.status ?? r.state ?? 'info')} /> },
            { key: 'priority', label: 'Priority', render: (r) => String(r.priority ?? r.severity ?? '—') },
            { key: 'updatedAt', label: 'Updated', render: (r) => String(r.updatedAt ?? r.updated_at ?? r.createdAt ?? '—') },
          ]}
          rows={rows}
          empty={
            <DemoAwareEmptyState
              title={`No ${tab} yet`}
              hint="Load Illustrative Demo Data for problems, changes, CAB approvals, and knowledge — or create an item above."
              setupHref="/demo/guided"
            />
          }
        />
      )}
      {debug && data != null && <JsonViewer data={data} title="ITSM API payload" />}
    </DashboardShell>
  );
}
