'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/UiStates';
import { InlineAiAssist } from '@/components/apex/InlineAiAssist';
import { PageHeader } from '@/components/eig/primitives';
import { ObservePageFrame } from '@/components/observe/ObservePageFrame';

type LogHit = {
  id: string;
  body: string;
  severity: string;
  serviceName: string;
  traceId?: string;
  recordedAt: string;
  twinHref?: string;
};

function LogsInner() {
  const search = useSearchParams();
  const [q, setQ] = useState(search.get('q') || '');
  const [severity, setSeverity] = useState(search.get('severity') || '');
  const [service, setService] = useState(search.get('service') || '');
  const [items, setItems] = useState<LogHit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (severity) params.set('severity', severity);
      if (service) params.set('service', service);
      params.set('limit', '100');
      const data = await apiClient<{ items: LogHit[]; total: number }>(`/observe/logs?${params}`);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Log search failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageHeader
        title="Logs"
        purpose="Enterprise log explorer with filter, search, timeline context, and correlation to traces and Twin."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)]"
          >
            <RefreshCw size={12} /> Search
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void load()}
            placeholder="Search log body…"
            className="w-full rounded-md border border-[var(--border)] bg-transparent py-2 pl-9 pr-3 text-sm"
            aria-label="Search logs"
          />
        </div>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
          aria-label="Severity"
        >
          <option value="">All severities</option>
          <option value="ERROR">ERROR</option>
          <option value="WARN">WARN</option>
          <option value="INFO">INFO</option>
        </select>
        <input
          value={service}
          onChange={(e) => setService(e.target.value)}
          placeholder="Service"
          className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
          aria-label="Service filter"
        />
      </div>

      {loading && <LoadingSkeleton rows={8} />}
      {err && <ErrorState message={err} onRetry={() => void load()} />}
      {!loading && !err && items.length === 0 && <EmptyState title="No logs" hint="Adjust filters or seed demo telemetry." />}

      {!loading && items.length > 0 && (
        <div className="space-y-4">
          <div className="text-xs text-[var(--muted)]">{total} matching events</div>
          <div className="overflow-hidden rounded-lg border border-[var(--border)]">
            <ul className="divide-y divide-[var(--border)]">
              {items.map((l) => (
                <li key={l.id} className="px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                    <span
                      className={
                        l.severity === 'ERROR'
                          ? 'font-semibold text-red-400'
                          : l.severity === 'WARN'
                            ? 'font-semibold text-amber-400'
                            : ''
                      }
                    >
                      {l.severity}
                    </span>
                    <span>{l.serviceName}</span>
                    <span>{new Date(l.recordedAt).toLocaleString()}</span>
                    {l.traceId && (
                      <Link href={`/observability/traces?traceId=${l.traceId}`} className="text-sky-300">
                        Trace
                      </Link>
                    )}
                    {l.twinHref && (
                      <Link href={l.twinHref} className="text-sky-300">
                        Twin
                      </Link>
                    )}
                  </div>
                  <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-[var(--text)]">{l.body}</pre>
                </li>
              ))}
            </ul>
          </div>
          <InlineAiAssist
            title="Summarize these logs"
            context={items
              .slice(0, 12)
              .map((l) => `[${l.severity}] ${l.serviceName}: ${l.body}`)
              .join('\n')}
            prompt="Summarize these logs, identify root themes, estimate business impact, and recommend remediation."
          />
        </div>
      )}
    </>
  );
}

export default function LogsPage() {
  return (
    <ObservePageFrame>
      <Suspense fallback={<LoadingSkeleton rows={8} />}>
        <LogsInner />
      </Suspense>
    </ObservePageFrame>
  );
}
