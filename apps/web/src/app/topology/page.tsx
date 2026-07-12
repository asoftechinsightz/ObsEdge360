'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Network, RefreshCw, Crosshair, Layers, Radio, LayoutGrid,
} from 'lucide-react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { friendlyError } from '@/lib/friendly-error';
import cytoscape from 'cytoscape';
import clsx from 'clsx';

type TopologyType =
  | 'application'
  | 'infrastructure'
  | 'cloud'
  | 'network'
  | 'business-service'
  | 'kubernetes'
  | 'service';

type LayoutAlgo = 'force-directed' | 'layered' | 'circular' | 'grid';

interface GraphNode {
  id: string;
  label: string;
  type: string;
  healthScore?: number;
  riskScore?: number;
  x?: number;
  y?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type?: string;
}

interface BlastRadius {
  rootCiId: string;
  rootCiName: string;
  affectedCis: number;
  criticalCount: number;
  atRiskCount: number;
  avgHealth: number;
  nodes: Array<{ id: string; name: string; depth: number; healthScore: number }>;
  layers?: Record<string, number>;
  source?: string;
}

const TYPES: TopologyType[] = [
  'application',
  'service',
  'infrastructure',
  'kubernetes',
  'cloud',
  'network',
  'business-service',
];

function healthColor(score?: number) {
  if (score == null) return '#0ea5e9';
  if (score >= 90) return '#34d399';
  if (score >= 70) return '#fbbf24';
  return '#f87171';
}

export default function TopologyPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [topoType, setTopoType] = useState<TopologyType>('application');
  const [layoutAlgo, setLayoutAlgo] = useState<LayoutAlgo>('force-directed');
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [layers, setLayers] = useState<Array<{ id: string; label: string; nodeCount: number }>>([]);
  const [deps, setDeps] = useState(0);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [blast, setBlast] = useState<BlastRadius | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [liveCursor, setLiveCursor] = useState(0);
  const [liveCount, setLiveCount] = useState(0);
  const [version, setVersion] = useState<number | null>(null);

  const renderGraph = useCallback((graphNodes: GraphNode[], graphEdges: GraphEdge[], highlight?: Set<string>) => {
    if (!containerRef.current) return;
    if (cyRef.current) cyRef.current.destroy();

    const hasPositions = graphNodes.some((n) => n.x != null && n.y != null);
    const cy = cytoscape({
      container: containerRef.current,
      elements: [
        ...graphNodes.map((n) => ({
          data: { id: n.id, label: n.label, type: n.type, health: n.healthScore },
          position: hasPositions && n.x != null && n.y != null ? { x: n.x, y: n.y } : undefined,
        })),
        ...graphEdges.map((e, i) => ({
          data: { id: `e-${i}`, source: e.source, target: e.target, label: e.type ?? '' },
        })),
      ],
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'background-color': (ele: cytoscape.NodeSingular) => healthColor(ele.data('health')),
            color: '#e2e8f0',
            'font-size': 10,
            'text-valign': 'bottom',
            'text-margin-y': 6,
            width: 28,
            height: 28,
            'border-width': 2,
            'border-color': '#1e293b',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'line-color': '#475569',
            'target-arrow-color': '#475569',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
          },
        },
        {
          selector: '.blast',
          style: {
            'border-color': '#f87171',
            'border-width': 4,
          },
        },
      ],
      layout: hasPositions
        ? { name: 'preset' }
        : { name: 'cose', animate: false, padding: 40 },
    });

    if (highlight) {
      cy.nodes().forEach((n) => {
        if (highlight.has(n.id())) n.addClass('blast');
      });
    }

    cy.on('tap', 'node', (evt) => {
      const d = evt.target.data();
      setSelected({
        id: d.id,
        label: d.label,
        type: d.type,
        healthScore: d.health,
      });
    });

    cyRef.current = cy;
  }, []);

  const loadTopology = useCallback(async (type: TopologyType) => {
    setLoading(true);
    setMessage('');
    try {
      const [snap, layerRes, depRes] = await Promise.all([
        apiClient<{
          version?: number;
          graph?: { nodes: GraphNode[]; edges: GraphEdge[] };
          node_count?: number;
        }>(`/cmdb/topology/${type}`),
        apiClient<{ layers: Array<{ id: string; label: string; nodeCount: number }> }>('/cmdb/topology/layers'),
        apiClient<{ count: number }>('/cmdb/topology/dependencies'),
      ]);
      const graph = snap.graph ?? { nodes: [], edges: [] };
      setNodes(graph.nodes ?? []);
      setEdges(graph.edges ?? []);
      setVersion(snap.version ?? null);
      setLayers(layerRes.layers ?? []);
      setDeps(depRes.count ?? 0);
      renderGraph(graph.nodes ?? [], graph.edges ?? []);
    } catch (err) {
      setMessage(friendlyError(err, 'Topology is empty. Load Illustrative Demo Data or run Discovery.'));
    } finally {
      setLoading(false);
    }
  }, [renderGraph]);

  useEffect(() => {
    void loadTopology(topoType);
  }, [topoType, loadTopology]);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await apiClient<{ events: Array<{ id: number }>; latestId: number }>(
          `/cmdb/topology/events?afterId=${liveCursor}`,
        );
        if (cancelled) return;
        if (res.events?.length) {
          setLiveCount((c) => c + res.events.length);
          setLiveCursor(res.latestId);
          await loadTopology(topoType);
        }
      } catch {
        /* ignore poll errors */
      }
    };
    const id = setInterval(poll, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [liveCursor, topoType, loadTopology]);

  async function refresh() {
    setLoading(true);
    try {
      await apiClient(`/cmdb/topology/${topoType}/refresh`, { method: 'POST', body: '{}' });
      await loadTopology(topoType);
      setMessage('Topology refreshed');
    } catch (err) {
      setMessage(friendlyError(err));
      setLoading(false);
    }
  }

  async function syncTraces() {
    setMessage('Syncing traces…');
    try {
      const r = await apiClient<{ edgesUpserted: number; relationshipsCreated: number }>(
        '/cmdb/topology/sync-traces',
        { method: 'POST', body: JSON.stringify({ hours: 1 }) },
      );
      setMessage(`Trace sync: ${r.edgesUpserted} edges, ${r.relationshipsCreated} new relationships`);
      await apiClient(`/cmdb/topology/${topoType}/refresh`, { method: 'POST', body: '{}' });
      await loadTopology(topoType);
    } catch (err) {
      setMessage(friendlyError(err));
    }
  }

  async function applyLayout() {
    setLoading(true);
    try {
      await apiClient(`/cmdb/topology/${topoType}/layout`, {
        method: 'POST',
        body: JSON.stringify({ algorithm: layoutAlgo }),
      });
      await loadTopology(topoType);
      setMessage(`Layout applied: ${layoutAlgo}`);
    } catch (err) {
      setMessage(friendlyError(err));
      setLoading(false);
    }
  }

  async function runBlast() {
    if (!selected) return;
    try {
      const r = await apiClient<BlastRadius>(
        `/twin/blast-radius/${selected.id}?depth=3&direction=downstream`,
      );
      setBlast(r);
      renderGraph(nodes, edges, new Set(r.nodes.map((n) => n.id)));
    } catch (err) {
      setMessage(friendlyError(err));
    }
  }

  return (
    <DashboardShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100 flex items-center gap-2">
              <Network className="h-6 w-6 text-sky-400" /> Live Topology
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Multi-layer operational graph with trace dependencies, layouts, and blast radius.
              {version != null && <span className="ml-2 text-slate-500">v{version}</span>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void syncTraces()}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600/80 px-3 py-1.5 text-sm text-white hover:bg-emerald-500"
            >
              <Radio className="h-4 w-4" /> Sync Traces
            </button>
            <button
              type="button"
              onClick={() => void applyLayout()}
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600/80 px-3 py-1.5 text-sm text-white hover:bg-indigo-500"
            >
              <LayoutGrid className="h-4 w-4" /> Layout
            </button>
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex items-center gap-1.5 rounded-md bg-sky-600/80 px-3 py-1.5 text-sm text-white hover:bg-sky-500"
            >
              <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} /> Refresh
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTopoType(t)}
              className={clsx(
                'rounded-md px-2.5 py-1 text-xs font-medium border',
                topoType === t
                  ? 'bg-sky-500/20 border-sky-500 text-sky-200'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500',
              )}
            >
              {t}
            </button>
          ))}
          <select
            value={layoutAlgo}
            onChange={(e) => setLayoutAlgo(e.target.value as LayoutAlgo)}
            className="ml-2 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
          >
            <option value="force-directed">force-directed</option>
            <option value="layered">layered</option>
            <option value="circular">circular</option>
            <option value="grid">grid</option>
          </select>
          <span className="text-xs text-slate-500 ml-auto">
            live events +{liveCount} · inferred deps {deps}
          </span>
        </div>

        {message && (
          <div className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          <div className="xl:col-span-3 rounded-lg border border-slate-800 bg-slate-950/80 overflow-hidden relative">
            {!loading && nodes.length === 0 && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80 p-6">
                <div className="max-w-md rounded-[var(--eig-radius-lg)] border border-dashed border-white/15 bg-slate-900/80 px-6 py-8 text-center">
                  <div className="text-sm font-medium text-slate-200">No topology nodes for this view</div>
                  <p className="mt-2 text-xs text-slate-500">
                    Live topology needs discovered CIs or synced traces. Start with Discovery, then refresh this map.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs">
                    <a href="/discovery" className="text-sky-400 hover:underline">Set up Discovery →</a>
                    <a href="/demo/guided" className="text-sky-400 hover:underline">Load / guided demo →</a>
                    <a href="/apm" className="text-sky-400 hover:underline">APM / service map →</a>
                  </div>
                </div>
              </div>
            )}
            <div ref={containerRef} className="h-[560px] w-full" />
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <h2 className="text-sm font-medium text-slate-200 flex items-center gap-1.5 mb-2">
                <Layers className="h-4 w-4 text-sky-400" /> Layers
              </h2>
              <ul className="space-y-1 text-xs text-slate-400">
                {layers.map((l) => (
                  <li key={l.id} className="flex justify-between">
                    <span>{l.label}</span>
                    <span className="text-slate-300">{l.nodeCount}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <h2 className="text-sm font-medium text-slate-200 mb-2">Selection</h2>
              {selected ? (
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="text-slate-100 font-medium">{selected.label}</div>
                  <div>{selected.type}</div>
                  <div>health {selected.healthScore ?? '—'}</div>
                  <button
                    type="button"
                    onClick={() => void runBlast()}
                    className="inline-flex items-center gap-1 rounded-md bg-rose-600/70 px-2 py-1 text-white hover:bg-rose-500"
                  >
                    <Crosshair className="h-3.5 w-3.5" /> Blast radius
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Select a node</p>
              )}
            </div>

            {blast && (
              <div className="rounded-lg border border-rose-900/50 bg-rose-950/30 p-3">
                <h2 className="text-sm font-medium text-rose-200 mb-2">Blast radius</h2>
                <p className="text-xs text-slate-300">
                  {blast.rootCiName}: {blast.affectedCis} affected · critical {blast.criticalCount} ·
                  avg health {blast.avgHealth}
                  {blast.source ? ` · ${blast.source}` : ''}
                </p>
                {blast.layers && (
                  <ul className="mt-2 space-y-0.5 text-xs text-slate-400">
                    {Object.entries(blast.layers).map(([k, v]) => (
                      <li key={k} className="flex justify-between">
                        <span>{k}</span>
                        <span>{v}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
