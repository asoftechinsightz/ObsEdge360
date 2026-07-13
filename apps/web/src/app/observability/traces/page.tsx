'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/UiStates';
import { InlineAiAssist } from '@/components/apex/InlineAiAssist';
import { PageHeader } from '@/components/eig/primitives';
import { ObservePageFrame } from '@/components/observe/ObservePageFrame';

type TraceRow = {
  traceId: string;
  services: string;
  spanCount: number;
  durationMs: number;
  errorCount: number;
  startedAt: string;
  twinHref?: string;
};

type TraceDetail = {
  traceId: string;
  spans: Array<{
    spanId: string;
    parentSpanId?: string;
    name: string;
    serviceName: string;
    durationMs: number;
    statusCode: string;
  }>;
};

function TracesInner() {
  const search = useSearchParams();
  const initialTrace = search.get('traceId') || '';
  const [items, setItems] = useState<TraceRow[]>([]);
  const [detail, setDetail] = useState<TraceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  async function openTrace(traceId: string) {
    try {
      const d = await apiClient<TraceDetail>(`/observe/traces/${encodeURIComponent(traceId)}`);
      setDetail(d);
    } catch {
      setDetail(null);
    }
  }

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const data = await apiClient<{ items: TraceRow[] }>('/observe/traces?limit=50');
      setItems(data.items || []);
      const focus = initialTrace || data.items?.[0]?.traceId;
      if (focus) await openTrace(focus);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load traces');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxDur = Math.max(1, ...(detail?.spans.map((s) => s.durationMs) || [1]));

  return (
    <>
      <PageHeader
        title="Traces"
        purpose="Distributed tracing, service flow, latency, root span analysis, and error visualization."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)]"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        }
      />

      {loading && <LoadingSkeleton rows={6} />}
      {err && <ErrorState message={err} onRetry={() => void load()} />}
      {!loading && !err && items.length === 0 && (
        <EmptyState title="No traces" hint="Seed demo telemetry or ingest OTLP." />
      )}

      {!loading && items.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="overflow-hidden rounded-lg border border-[var(--border)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2">Trace</th>
                  <th className="px-3 py-2">Duration</th>
                  <th className="px-3 py-2">Errors</th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr
                    key={t.traceId}
                    className="cursor-pointer border-t border-[var(--border)] hover:bg-white/[0.03]"
                    onClick={() => void openTrace(t.traceId)}
                  >
                    <td className="px-3 py-2">
                      <div className="font-mono text-xs text-[var(--text)]">{t.traceId.slice(0, 16)}…</div>
                      <div className="text-[11px] text-[var(--muted)]">{t.services}</div>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{t.durationMs} ms</td>
                    <td className="px-3 py-2 tabular-nums text-red-400">{t.errorCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3">
            {detail ? (
              <div className="rounded-lg border border-[var(--border)] p-4">
                <div className="text-xs text-[var(--muted)]">Waterfall · {detail.traceId}</div>
                <ul className="mt-3 space-y-2">
                  {detail.spans.map((s) => (
                    <li key={s.spanId}>
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text)]">
                          {s.serviceName} · {s.name}
                        </span>
                        <span className={s.statusCode === 'ERROR' ? 'text-red-400' : 'text-[var(--muted)]'}>
                          {s.durationMs} ms · {s.statusCode}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 rounded bg-white/5">
                        <div
                          className={s.statusCode === 'ERROR' ? 'h-1.5 rounded bg-red-500' : 'h-1.5 rounded bg-sky-500'}
                          style={{ width: `${Math.max(4, (s.durationMs / maxDur) * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                <Link href="/observability/logs" className="mt-4 inline-block text-xs text-sky-300">
                  Correlate logs →
                </Link>
              </div>
            ) : (
              <EmptyState title="Select a trace" hint="Choose a row to inspect spans." />
            )}
            <InlineAiAssist
              title="Explain this trace"
              context={
                detail
                  ? `Trace ${detail.traceId}\n${detail.spans.map((s) => `${s.serviceName} ${s.name} ${s.durationMs}ms ${s.statusCode}`).join('\n')}`
                  : 'No trace selected'
              }
              prompt="Explain this trace, identify the critical path and error span, estimate business impact, and recommend remediation."
            />
          </div>
        </div>
      )}
    </>
  );
}

export default function TracesPage() {
  return (
    <ObservePageFrame>
      <Suspense fallback={<LoadingSkeleton rows={6} />}>
        <TracesInner />
      </Suspense>
    </ObservePageFrame>
  );
}
