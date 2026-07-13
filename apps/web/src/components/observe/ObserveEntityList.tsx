'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Network, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/UiStates';
import { InlineAiAssist } from '@/components/apex/InlineAiAssist';
import { PageHeader } from '@/components/eig/primitives';
import { HealthBadge } from './ObserveSubnav';
import clsx from 'clsx';

export type ObserveEntity = {
  id: string;
  name: string;
  kind: string;
  health: string;
  healthScore: number;
  environment?: string;
  owner?: string;
  latencyMs?: number;
  errorRate?: number;
  availability?: number;
  businessImpact?: string;
  twinHref: string;
  observeHref: string;
  labels?: Record<string, string>;
  source: string;
};

type Props = {
  domain: string;
  title: string;
  purpose: string;
  apiPath: string;
};

export function ObserveEntityList({ domain, title, purpose, apiPath }: Props) {
  const search = useSearchParams();
  const focus = search.get('focus') || '';
  const [items, setItems] = useState<ObserveEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const data = await apiClient<{ items: ObserveEntity[] }>(apiPath);
      setItems(data.items || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [apiPath]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((i) => {
      if (focus && i.id !== focus && i.name !== focus) {
        // still show all; highlight focus
      }
      if (!needle) return true;
      return (
        i.name.toLowerCase().includes(needle) ||
        i.kind.toLowerCase().includes(needle) ||
        Object.values(i.labels || {}).some((v) => v.toLowerCase().includes(needle))
      );
    });
  }, [items, q, focus]);

  const selected = filtered.find((i) => i.id === focus) || filtered[0];

  return (
    <div>
      <PageHeader
        title={title}
        purpose={purpose}
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)]"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        }
        meta={<span>OpsEdge360 Unified Observability · {domain}</span>}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by name, kind, pack…"
          className="min-w-[220px] flex-1 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text)]"
          aria-label="Filter entities"
        />
      </div>

      {loading && <LoadingSkeleton rows={6} />}
      {err && <ErrorState message={err} onRetry={() => void load()} />}
      {!loading && !err && filtered.length === 0 && (
        <EmptyState title="No entities" hint="Load the Enterprise Demo pack or connect collectors." />
      )}

      {!loading && !err && filtered.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="overflow-hidden rounded-lg border border-[var(--border)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Kind</th>
                  <th className="px-3 py-2">Health</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Twin</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className={clsx(
                      'border-t border-[var(--border)] hover:bg-white/[0.03]',
                      (focus === row.id || selected?.id === row.id) && 'bg-[var(--accent)]/5',
                    )}
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium text-[var(--text)]">{row.name}</div>
                      {row.businessImpact && (
                        <div className="text-[11px] text-amber-300/90">{row.businessImpact}</div>
                      )}
                      {row.labels?.pack && (
                        <div className="text-[11px] text-[var(--muted)]">{row.labels.pack}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[var(--muted)]">{row.kind}</td>
                    <td className="px-3 py-2">
                      <HealthBadge health={row.health} />
                    </td>
                    <td className="px-3 py-2 tabular-nums">{row.healthScore}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={row.twinHref}
                        className="inline-flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200"
                      >
                        <Network size={12} /> Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3">
            {selected && (
              <>
                <div className="rounded-lg border border-[var(--border)] p-4">
                  <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Selected</div>
                  <div className="mt-1 text-lg font-semibold text-[var(--text)]">{selected.name}</div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
                    <HealthBadge health={selected.health} />
                    {selected.latencyMs != null && <span>Latency {selected.latencyMs} ms</span>}
                    {selected.errorRate != null && <span>Errors {selected.errorRate}%</span>}
                    {selected.availability != null && <span>Avail {selected.availability}%</span>}
                  </div>
                  {selected.businessImpact && (
                    <p className="mt-3 text-sm text-amber-200/90">{selected.businessImpact}</p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={selected.twinHref}
                      className="rounded-md bg-[var(--accent)]/20 px-3 py-1.5 text-xs font-medium text-[var(--accent)]"
                    >
                      Digital Twin impact
                    </Link>
                    <Link
                      href={`/observability/logs?service=${encodeURIComponent(selected.name)}`}
                      className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)]"
                    >
                      Related logs
                    </Link>
                    <Link
                      href="/observability/traces"
                      className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)]"
                    >
                      Traces
                    </Link>
                  </div>
                </div>
                <InlineAiAssist
                  title="AI investigation"
                  context={`Entity: ${selected.name}\nKind: ${selected.kind}\nHealth: ${selected.health}\nImpact: ${selected.businessImpact || 'n/a'}\nLabels: ${JSON.stringify(selected.labels || {})}`}
                  prompt={`Explain this ${domain} entity, estimate business impact, identify likely root cause, and recommend remediation and automation.`}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
