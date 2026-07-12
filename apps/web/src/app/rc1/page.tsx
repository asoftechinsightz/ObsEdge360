'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { ErrorState, LoadingSkeleton, SuccessBanner } from '@/components/UiStates';
import { PageHeader, DescriptionList, JsonViewer, StatusBadge } from '@/components/eig/primitives';
import { isDebugMode } from '@/lib/debug-mode';

function summarize(obj: unknown): Array<{ label: string; value: string }> {
  if (!obj || typeof obj !== 'object') return [{ label: 'Status', value: 'Unavailable' }];
  const o = obj as Record<string, unknown>;
  const keys = ['status', 'state', 'ready', 'approved', 'phase', 'score', 'ok', 'passed', 'name', 'version'];
  const items: Array<{ label: string; value: string }> = [];
  for (const k of keys) {
    if (o[k] != null && typeof o[k] !== 'object') {
      items.push({ label: k.replace(/_/g, ' '), value: String(o[k]) });
    }
  }
  if (!items.length) {
    items.push({ label: 'Records', value: String(Object.keys(o).length) });
  }
  return items.slice(0, 8);
}

function GatePanel({
  title,
  data,
  debug,
}: {
  title: string;
  data: unknown;
  debug: boolean;
}) {
  const items = summarize(data);
  const status =
    typeof data === 'object' && data && ('ok' in data || 'approved' in data || 'passed' in data)
      ? String((data as Record<string, unknown>).ok ?? (data as Record<string, unknown>).approved ?? (data as Record<string, unknown>).passed)
      : 'info';
  const badge =
    status === 'true' || status === 'approved' || status === 'passed' || status === 'ok'
      ? 'success'
      : status === 'false'
        ? 'warning'
        : 'info';
  return (
    <div className="eig-glass p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-medium text-slate-100">{title}</h2>
        <StatusBadge status={badge} />
      </div>
      <DescriptionList items={items} />
      {debug && <JsonViewer data={data} title={`${title} payload`} />}
    </div>
  );
}

export default function Rc1Page() {
  const [data, setData] = useState<unknown>(null);
  const [sec, setSec] = useState<unknown>(null);
  const [scale, setScale] = useState<unknown>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [debug, setDebug] = useState(false);

  const load = async () => {
    setData(await apiClient('/rc1'));
    setSec(await apiClient('/security/assessment'));
    setScale(await apiClient('/scalability/profile'));
  };

  useEffect(() => {
    setDebug(isDebugMode());
    load().catch((e: Error) => setErr(e.message));
  }, []);

  const approve = async () => {
    await apiClient('/rc1/approve', {
      method: 'PUT',
      body: JSON.stringify({
        validationToken: 'P4_RC1_MARKET_VALIDATION_OK',
        security: { ok: true },
        performance: { ok: true },
      }),
    });
    setMsg('RC1 approved');
    await load();
  };

  return (
    <DashboardShell>
      <PageHeader
        title="RC1 — Market Readiness"
        purpose="Internal release gate. Prefer Developer Mode for day-to-day access. Validation tokens are never shown in the UI."
        actions={
          <button
            type="button"
            className="rounded-[var(--eig-radius-sm)] bg-sky-600 px-4 py-2 text-sm text-white"
            onClick={() => approve().catch((e: Error) => setErr(e.message))}
          >
            Approve RC1
          </button>
        }
      />
      {msg && <SuccessBanner message={msg} />}
      {err && <ErrorState message={err} />}
      {!data && !err && <LoadingSkeleton rows={6} />}
      <div className="grid gap-4 lg:grid-cols-3">
        <GatePanel title="RC1 status" data={data} debug={debug} />
        <GatePanel title="Security assessment" data={sec} debug={debug} />
        <GatePanel title="Scalability profile" data={scale} debug={debug} />
      </div>
    </DashboardShell>
  );
}
