'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

export function PageHeader({
  title,
  purpose,
  actions,
  meta,
}: {
  title: string;
  purpose?: string;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">{title}</h1>
        {purpose && <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">{purpose}</p>}
        {meta && <div className="mt-2 text-xs text-slate-500">{meta}</div>}
      </div>
      {actions && <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatusBadge({
  status,
}: {
  status: 'healthy' | 'degraded' | 'critical' | 'unknown' | 'success' | 'warning' | 'info' | string;
}) {
  const map: Record<string, string> = {
    healthy: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    success: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    degraded: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
    warning: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
    at_risk: 'bg-red-500/15 text-red-300 ring-red-500/30',
    critical: 'bg-red-500/15 text-red-300 ring-red-500/30',
    info: 'bg-sky-500/15 text-sky-200 ring-sky-500/30',
    unknown: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
  };
  const cls = map[status] || map.unknown;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${cls}`}>
      {String(status).replace(/_/g, ' ')}
    </span>
  );
}

export function DescriptionList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="eig-panel divide-y divide-white/5 overflow-hidden">
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-4">
          <dt className="text-xs font-medium text-slate-400">{item.label}</dt>
          <dd className="text-sm text-slate-100 sm:col-span-2">{item.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function JsonViewer({ data, title = 'Technical details' }: { data: unknown; title?: string }) {
  return (
    <details className="eig-panel mt-4 overflow-hidden">
      <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-slate-400 hover:text-slate-200">
        {title} (Debug)
      </summary>
      <pre className="max-h-96 overflow-auto border-t border-white/5 bg-black/20 p-4 text-xs text-slate-400">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}

export function DataTable({
  columns,
  rows,
  empty,
}: {
  columns: Array<{ key: string; label: string; render?: (row: Record<string, unknown>) => ReactNode }>;
  rows: Array<Record<string, unknown>>;
  empty?: ReactNode;
}) {
  if (!rows.length) return <>{empty}</>;
  return (
    <div className="eig-panel overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs text-slate-400">
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={String(row.id ?? i)} className="border-b border-white/5 hover:bg-white/[0.03]">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 text-slate-200">
                  {c.render ? c.render(row) : String(row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
