'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import cytoscape from 'cytoscape';
import { apiClient } from '@/lib/api-client';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/UiStates';
import { InlineAiAssist } from '@/components/apex/InlineAiAssist';
import { PageHeader } from '@/components/eig/primitives';
import { ObservePageFrame } from '@/components/observe/ObservePageFrame';
import { HealthBadge } from '@/components/observe/ObserveSubnav';

type Topo = {
  nodes: Array<{ id: string; label: string; kind: string; health: string; twinHref: string }>;
  edges: Array<{ source: string; target: string; calls?: number; avgDurationMs?: number }>;
  asOf: string;
  source: string;
};

export default function ObserveTopologyPage() {
  const [data, setData] = useState<Topo | null>(null);
  const [selected, setSelected] = useState<Topo['nodes'][0] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const topo = await apiClient<Topo>('/observe/topology');
      setData(topo);
      setSelected(topo.nodes[0] || null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load topology');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!data || !containerRef.current) return;
    if (cyRef.current) cyRef.current.destroy();
    const color = (h: string) =>
      h === 'critical' ? '#f87171' : h === 'degraded' ? '#fbbf24' : h === 'healthy' ? '#34d399' : '#94a3b8';
    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: [
        ...data.nodes.map((n) => ({
          data: { id: n.id, label: n.label, health: n.health, twinHref: n.twinHref },
        })),
        ...data.edges.map((e, i) => ({
          data: { id: `e${i}`, source: e.source, target: e.target, label: e.calls ? `${e.calls}` : '' },
        })),
      ],
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'background-color': (ele: cytoscape.NodeSingular) => color(String(ele.data('health'))),
            color: '#e2e8f0',
            'font-size': 10,
            'text-valign': 'bottom',
            'text-margin-y': 6,
            width: 28,
            height: 28,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'line-color': '#334155',
            'target-arrow-color': '#334155',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            label: 'data(label)',
            'font-size': 8,
            color: '#64748b',
          },
        },
      ],
      layout: { name: 'cose', animate: false, padding: 24 },
    });
    cyRef.current.on('tap', 'node', (evt) => {
      const id = String(evt.target.id());
      const node = data.nodes.find((n) => n.id === id) || null;
      setSelected(node);
    });
    return () => {
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, [data]);

  return (
    <ObservePageFrame>
      <PageHeader
        title="Topology"
        purpose="Interactive dependency graph with health propagation, impact analysis, and business service mapping."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)]"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        }
        meta={data ? `Source ${data.source} · ${data.nodes.length} nodes · ${data.edges.length} edges` : undefined}
      />

      {loading && <LoadingSkeleton rows={6} />}
      {err && <ErrorState message={err} onRetry={() => void load()} />}
      {!loading && !err && (!data || data.nodes.length === 0) && (
        <EmptyState title="No topology" hint="Load demo pack or sync trace dependencies." />
      )}

      {data && data.nodes.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div ref={containerRef} className="h-[480px] rounded-lg border border-[var(--border)] bg-[#0b1220]" />
          <div className="space-y-3">
            {selected ? (
              <div className="rounded-lg border border-[var(--border)] p-4">
                <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{selected.kind}</div>
                <div className="mt-1 text-lg font-semibold text-[var(--text)]">{selected.label}</div>
                <div className="mt-2">
                  <HealthBadge health={selected.health} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={selected.twinHref}
                    className="rounded-md bg-[var(--accent)]/20 px-3 py-1.5 text-xs font-medium text-[var(--accent)]"
                  >
                    Digital Twin impact
                  </Link>
                  <Link
                    href={`/observability/traces`}
                    className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)]"
                  >
                    Traces
                  </Link>
                  <Link href="/topology" className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)]">
                    Estate topology
                  </Link>
                </div>
              </div>
            ) : (
              <EmptyState title="Select a node" hint="Click a node to inspect impact links." />
            )}
            <InlineAiAssist
              title="Impact analysis"
              context={`Topology nodes: ${data.nodes.map((n) => `${n.label}:${n.health}`).join(', ')}\nSelected: ${selected?.label || 'none'}`}
              prompt="Analyze dependency impact, health propagation, and recommend next investigation steps with business impact."
            />
          </div>
        </div>
      )}
    </ObservePageFrame>
  );
}
