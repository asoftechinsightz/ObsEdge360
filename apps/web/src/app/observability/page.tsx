'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/UiStates';
import { InlineAiAssist } from '@/components/apex/InlineAiAssist';
import { PageHeader } from '@/components/eig/primitives';
import { ObservePageFrame } from '@/components/observe/ObservePageFrame';
import { HealthBadge } from '@/components/observe/ObserveSubnav';
import clsx from 'clsx';

type Overview = {
  asOf: string;
  brand: string;
  engineLabel: string;
  domains: Array<{
    id: string;
    label: string;
    href: string;
    count: number;
    health: string;
    summary: string;
  }>;
  telemetry: {
    metricsLastHour: number;
    logsLastHour: number;
    spansLastHour: number;
    services: number;
  };
  narrative: { what: string; why: string; impact: string; next: string; nextHref: string };
  aiPrompts: string[];
};

export default function ObservabilityOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const o = await apiClient<Overview>('/observe/overview');
      setData(o);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load overview');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <ObservePageFrame>
      <PageHeader
        title="Unified Observability"
        purpose="Applications, infrastructure, Kubernetes, containers, databases, logs, metrics, traces, and topology — one OpsEdge360 experience."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)]"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        }
        meta={data ? `${data.brand} · ${data.engineLabel} · as of ${new Date(data.asOf).toLocaleString()}` : undefined}
      />

      {loading && <LoadingSkeleton rows={5} />}
      {err && <ErrorState message={err} onRetry={() => void load()} />}
      {!loading && !err && !data && <EmptyState title="No observability data" hint="Seed demo telemetry or connect collectors." />}

      {data && (
        <div className="space-y-6">
          <section className="rounded-lg border border-[var(--border)] bg-gradient-to-br from-sky-500/5 to-transparent p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Operating picture</div>
            <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">{data.narrative.what}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{data.narrative.why}</p>
            <p className="mt-2 text-sm text-amber-200/90">{data.narrative.impact}</p>
            <Link
              href={data.narrative.nextHref}
              className="mt-3 inline-flex text-sm font-medium text-sky-300 hover:text-sky-200"
            >
              Next: {data.narrative.next} →
            </Link>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Metrics (1h)', value: data.telemetry.metricsLastHour },
              { label: 'Logs (1h)', value: data.telemetry.logsLastHour },
              { label: 'Spans (1h)', value: data.telemetry.spansLastHour },
              { label: 'Services', value: data.telemetry.services },
            ].map((k) => (
              <div key={k.label} className="rounded-lg border border-[var(--border)] px-3 py-3">
                <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">{k.label}</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums text-[var(--text)]">{k.value}</div>
              </div>
            ))}
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.domains.map((d) => (
              <Link
                key={d.id}
                href={d.href}
                className={clsx(
                  'rounded-lg border border-[var(--border)] p-4 transition-colors hover:border-sky-500/40 hover:bg-sky-500/5',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-[var(--text)]">{d.label}</div>
                  <HealthBadge health={d.health} />
                </div>
                <div className="mt-2 text-2xl font-semibold tabular-nums text-[var(--text)]">{d.count}</div>
                <p className="mt-1 text-xs text-[var(--muted)]">{d.summary}</p>
              </Link>
            ))}
          </section>

          <InlineAiAssist
            title="AI executive summary"
            context={`Observability narrative: ${JSON.stringify(data.narrative)}\nTelemetry: ${JSON.stringify(data.telemetry)}\nDomains: ${data.domains.map((d) => `${d.label}:${d.health}`).join(', ')}`}
            prompt={data.aiPrompts[4] || 'Generate an executive summary of observability health.'}
          />
        </div>
      )}
    </ObservePageFrame>
  );
}
