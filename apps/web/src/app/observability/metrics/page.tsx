'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/UiStates';
import { InlineAiAssist } from '@/components/apex/InlineAiAssist';
import { PageHeader } from '@/components/eig/primitives';
import { ObservePageFrame } from '@/components/observe/ObservePageFrame';
import clsx from 'clsx';

type Metric = {
  name: string;
  value: number;
  unit?: string;
  serviceName?: string;
  category: string;
  recordedAt: string;
  source: string;
};

export default function MetricsPage() {
  const [items, setItems] = useState<Metric[]>([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      const data = await apiClient<{ items: Metric[] }>(`/observe/metrics?${params}`);
      setItems(data.items || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [category]);

  return (
    <ObservePageFrame>
      <PageHeader
        title="Metrics"
        purpose="Infrastructure, application, and business metrics with trends and thresholds in OpsEdge360."
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

      <div className="mb-4 flex flex-wrap gap-2">
        {['', 'infrastructure', 'application', 'business'].map((c) => (
          <button
            key={c || 'all'}
            type="button"
            onClick={() => setCategory(c)}
            className={clsx(
              'rounded-md px-3 py-1.5 text-xs font-medium',
              category === c ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-[var(--muted)] hover:bg-white/5',
            )}
          >
            {c || 'All'}
          </button>
        ))}
      </div>

      {loading && <LoadingSkeleton rows={6} />}
      {err && <ErrorState message={err} onRetry={() => void load()} />}
      {!loading && !err && items.length === 0 && <EmptyState title="No metrics" hint="Seed demo telemetry or connect collectors." />}

      {!loading && items.length > 0 && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((m, i) => (
              <div key={`${m.name}-${m.serviceName}-${i}`} className="rounded-lg border border-[var(--border)] p-4">
                <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">{m.category}</div>
                <div className="mt-1 font-medium text-[var(--text)]">{m.name}</div>
                <div className="mt-2 text-2xl font-semibold tabular-nums text-[var(--text)]">
                  {m.value}
                  {m.unit ? <span className="ml-1 text-sm font-normal text-[var(--muted)]">{m.unit}</span> : null}
                </div>
                <div className="mt-1 text-xs text-[var(--muted)]">{m.serviceName || '—'}</div>
              </div>
            ))}
          </div>
          <InlineAiAssist
            title="Explain metric trends"
            context={items
              .slice(0, 15)
              .map((m) => `${m.category} ${m.name}=${m.value}${m.unit || ''} (${m.serviceName || ''})`)
              .join('\n')}
            prompt="Explain these metrics, call out threshold risks, estimate business impact, and recommend actions."
          />
        </div>
      )}
    </ObservePageFrame>
  );
}
