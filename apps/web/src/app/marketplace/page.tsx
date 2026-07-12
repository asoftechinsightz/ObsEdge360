'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/UiStates';
import { PageHeader, DataTable, JsonViewer, StatusBadge } from '@/components/eig/primitives';
import { isDebugMode } from '@/lib/debug-mode';

function asRows(data: unknown): Array<Record<string, unknown>> {
  if (!data) return [];
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  if (typeof data === 'object') {
    const o = data as Record<string, unknown>;
    for (const key of ['extensions', 'items', 'packs', 'connectors', 'data']) {
      if (Array.isArray(o[key])) return o[key] as Array<Record<string, unknown>>;
    }
    return Object.keys(o).length ? [o] : [];
  }
  return [];
}

export default function MarketplacePage() {
  const [data, setData] = useState<unknown>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [debug, setDebug] = useState(false);

  useEffect(() => {
    setDebug(isDebugMode());
    apiClient('/marketplace/extensions')
      .then(setData)
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => asRows(data), [data]);

  return (
    <DashboardShell>
      <PageHeader
        title="Marketplace"
        purpose="Browse extension packs, connectors, and solution modules available to this tenant."
      />
      {err && <ErrorState message={err} />}
      {loading && <LoadingSkeleton rows={4} />}
      {!loading && !err && (
        <DataTable
          columns={[
            { key: 'name', label: 'Extension', render: (r) => String(r.name ?? r.title ?? r.id ?? 'Extension') },
            { key: 'category', label: 'Category', render: (r) => String(r.category ?? r.type ?? 'Pack') },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={String(r.status ?? r.enabled === false ? 'unknown' : 'info')} /> },
            { key: 'version', label: 'Version', render: (r) => String(r.version ?? '—') },
          ]}
          rows={rows}
          empty={
            <EmptyState
              title="Marketplace catalog is empty"
              hint="Extensions appear when packs are registered. Public marketplace is not required for core platform use."
            />
          }
        />
      )}
      {debug && data != null && <JsonViewer data={data} title="Marketplace API payload" />}
    </DashboardShell>
  );
}
