'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Network, RefreshCw, Crosshair, Layers, AlertTriangle,
} from 'lucide-react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import cytoscape from 'cytoscape';
import clsx from 'clsx';

interface TwinNode {
  id: string;
  label: string;
  type: string;
  status?: string;
  healthScore?: number;
  riskScore?: number;
}

interface TwinEdge {
  source: string;
  target: string;
  type?: string;
  strength?: string;
}

interface ImpactNode {
  id: string;
  name: string;
  ciType: string;
  status: string;
  healthScore: number;
  riskScore: number;
  depth: number;
}

interface BlastRadius {
  rootCiId: string;
  rootCiName: string;
  rootCiType: string;
  depth: number;
  direction: string;
  affectedCis: number;
  criticalCount: number;
  atRiskCount: number;
  avgHealth: number;
  nodes: ImpactNode[];
  edges: Array<{ source: string; target: string; type: string; strength: string }>;
  source: string;
}

type LayoutName = 'breadthfirst' | 'cose' | 'circle' | 'grid';

function healthColor(score?: number) {
  if (score == null) return '#0ea5e9';
  if (score >= 90) return '#34d399';
  if (score >= 70) return '#fbbf24';
  return '#f87171';
}

export default function DigitalTwinPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [nodes, setNodes] = useState<TwinNode[]>([]);
  const [edges, setEdges] = useState<TwinEdge[]>([]);
  const [selected, setSelected] = useState<TwinNode | null>(null);
  const [blast, setBlast] = useState<BlastRadius | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [layout, setLayout] = useState<LayoutName>('breadthfirst');
  const [depth, setDepth] = useState(3);
  const [direction, setDirection] = useState<'downstream' | 'upstream' | 'both'>('downstream');

  const renderGraph = useCallback((
    graphNodes: TwinNode[],
    graphEdges: TwinEdge[],
    highlightIds?: Set<string>,
    rootId?: string,
  ) => {
    if (!containerRef.current) return;

    const elements = [
      ...graphNodes.map((n) => ({
        data: {
          id: n.id,
          label: n.label,
          type: n.type,
          healthScore: n.healthScore ?? 100,
          riskScore: n.riskScore ?? 0,
          highlight: highlightIds?.has(n.id) ? 1 : 0,
          isRoot: rootId === n.id ? 1 : 0,
        },
      })),
      ...graphEdges.map((e, i) => ({
        data: {
          id: `e-${e.source}-${e.target}-${i}`,
          source: e.source,
          target: e.target,
          type: e.type ?? '',
          strength: e.strength ?? 'normal',
          highlight: highlightIds && highlightIds.has(e.source) && highlightIds.has(e.target) ? 1 : 0,
        },
      })),
    ];

    if (cyRef.current) cyRef.current.destroy();

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'background-color': '#0ea5e9',
            color: '#f8fafc',
            'font-size': 10,
            'text-valign': 'bottom',
            'text-margin-y': 6,
            width: 36,
            height: 36,
            'border-width': 2,
            'border-color': '#1e293b',
            opacity: highlightIds ? 0.25 : 1,
          },
        },
        {
          selector: 'node[type = "service"]',
          style: { 'background-color': '#8b5cf6', width: 44, height: 44 },
        },
        {
          selector: 'node[type = "database"]',
          style: { 'background-color': '#f59e0b' },
        },
        {
          selector: 'node[type = "application"]',
          style: { 'background-color': '#06b6d4' },
        },
        {
          selector: 'node[healthScore < 80]',
          style: { 'background-color': '#ef4444' },
        },
        {
          selector: 'node[highlight = 1]',
          style: {
            opacity: 1,
            'border-width': 3,
            'border-color': '#f97316',
            width: 48,
            height: 48,
          },
        },
        {
          selector: 'node[isRoot = 1]',
          style: {
            opacity: 1,
            'border-width': 4,
            'border-color': '#f43f5e',
            'background-color': '#e11d48',
            width: 56,
            height: 56,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#475569',
            'target-arrow-color': '#475569',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            opacity: highlightIds ? 0.15 : 0.8,
          },
        },
        {
          selector: 'edge[highlight = 1]',
          style: {
            opacity: 1,
            width: 3,
            'line-color': '#f97316',
            'target-arrow-color': '#f97316',
          },
        },
        {
          selector: 'edge[strength = "critical"]',
          style: { width: 3, 'line-color': '#ef4444', 'target-arrow-color': '#ef4444' },
        },
      ],
      layout: {
        name: layout,
        directed: layout === 'breadthfirst',
        padding: 40,
        animate: false,
      } as cytoscape.LayoutOptions,
    });

    cy.on('tap', 'node', (evt) => {
      const data = evt.target.data();
      setSelected({
        id: data.id,
        label: data.label,
        type: data.type,
        healthScore: data.healthScore,
        riskScore: data.riskScore,
      });
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelected(null);
      }
    });

    cyRef.current = cy;
  }, [layout]);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setBlast(null);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('ciType', typeFilter);
      const qs = params.toString() ? `?${params}` : '';
      const graph = await apiClient<{ nodes: TwinNode[]; edges: TwinEdge[] }>(`/twin/graph${qs}`);
      setNodes(graph.nodes);
      setEdges(graph.edges);
      renderGraph(graph.nodes, graph.edges);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load topology');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, renderGraph]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  useEffect(() => {
    if (nodes.length === 0) return;
    if (blast) {
      const ids = new Set(blast.nodes.map((n) => n.id));
      renderGraph(nodes, edges, ids, blast.rootCiId);
    } else {
      renderGraph(nodes, edges);
    }
  }, [layout]); // eslint-disable-line react-hooks/exhaustive-deps

  async function analyzeImpact(ciId?: string) {
    const id = ciId ?? selected?.id;
    if (!id) {
      setMessage('Select a node first');
      return;
    }
    setAnalyzing(true);
    try {
      const result = await apiClient<BlastRadius>(
        `/twin/blast-radius/${id}?depth=${depth}&direction=${direction}`,
      );
      setBlast(result);
      const ids = new Set(result.nodes.map((n) => n.id));
      renderGraph(nodes, edges, ids, result.rootCiId);
      setMessage(`Blast radius: ${result.affectedCis} affected CI(s) within depth ${result.depth}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Impact analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }

  function clearBlast() {
    setBlast(null);
    renderGraph(nodes, edges);
    setMessage('');
  }

  const types = [...new Set(nodes.map((n) => n.type))].sort();

  return (
    <DashboardShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Digital Twin</h1>
          <p className="text-sm text-slate-400">Topology graph, dependency impact, and blast-radius analysis</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => loadGraph()} className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => analyzeImpact()}
            disabled={!selected || analyzing}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <Crosshair size={16} /> {analyzing ? 'Analyzing…' : 'Analyze impact'}
          </button>
          {blast && (
            <button type="button" onClick={clearBlast} className="rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800">
              Clear highlight
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-slate-600 bg-surface-elevated px-4 py-2 text-sm text-slate-300">
          {message}
          <button type="button" className="ml-3 text-slate-500 hover:text-white" onClick={() => setMessage('')}>×</button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-slate-500" />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-lg border border-slate-600 bg-surface px-2 py-1.5">
            <option value="">All types</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <select value={layout} onChange={(e) => setLayout(e.target.value as LayoutName)} className="rounded-lg border border-slate-600 bg-surface px-2 py-1.5">
          <option value="breadthfirst">Breadth-first</option>
          <option value="cose">Force-directed</option>
          <option value="circle">Circle</option>
          <option value="grid">Grid</option>
        </select>
        <label className="flex items-center gap-2 text-slate-400">
          Depth
          <select value={depth} onChange={(e) => setDepth(Number(e.target.value))} className="rounded-lg border border-slate-600 bg-surface px-2 py-1.5 text-slate-100">
            {[1, 2, 3, 4, 5, 6].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <select value={direction} onChange={(e) => setDirection(e.target.value as typeof direction)} className="rounded-lg border border-slate-600 bg-surface px-2 py-1.5">
          <option value="downstream">Downstream (depends on)</option>
          <option value="upstream">Upstream (dependents)</option>
          <option value="both">Both directions</option>
        </select>
        <span className="text-xs text-slate-500">{nodes.length} nodes · {edges.length} edges</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {loading && <p className="mb-2 text-sm text-slate-400">Loading topology…</p>}
          <div ref={containerRef} className="h-[560px] rounded-xl border border-slate-700 bg-surface-elevated" />
          {selected && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700 bg-surface-elevated p-4 text-sm">
              <div>
                <span className="font-medium">{selected.label}</span>
                <span className="ml-2 text-slate-400">{selected.type}</span>
                {selected.healthScore != null && (
                  <span className="ml-2" style={{ color: healthColor(selected.healthScore) }}>
                    Health {selected.healthScore}
                  </span>
                )}
                {selected.riskScore != null && selected.riskScore > 0 && (
                  <span className="ml-2 text-amber-400">Risk {selected.riskScore}</span>
                )}
              </div>
              <button type="button" onClick={() => analyzeImpact(selected.id)} className="text-primary hover:underline">
                Run blast-radius analysis
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {blast ? (
            <>
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-orange-300">
                  <AlertTriangle size={16} />
                  <span className="font-medium">Blast radius</span>
                </div>
                <p className="text-sm">
                  Root: <span className="font-medium">{blast.rootCiName}</span>
                  <span className="ml-1 text-xs text-slate-500">({blast.rootCiType})</span>
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-surface p-2">
                    <div className="text-xs text-slate-500">Affected</div>
                    <div className="text-lg font-semibold">{blast.affectedCis}</div>
                  </div>
                  <div className="rounded-lg bg-surface p-2">
                    <div className="text-xs text-slate-500">Critical</div>
                    <div className="text-lg font-semibold text-red-400">{blast.criticalCount}</div>
                  </div>
                  <div className="rounded-lg bg-surface p-2">
                    <div className="text-xs text-slate-500">At risk</div>
                    <div className="text-lg font-semibold text-amber-400">{blast.atRiskCount}</div>
                  </div>
                  <div className="rounded-lg bg-surface p-2">
                    <div className="text-xs text-slate-500">Avg health</div>
                    <div className="text-lg font-semibold">{blast.avgHealth}</div>
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-slate-500">
                  Depth {blast.depth} · {blast.direction} · source: {blast.source}
                </p>
              </div>

              <div className="max-h-[360px] overflow-y-auto rounded-xl border border-slate-700 bg-surface-elevated">
                <div className="sticky top-0 border-b border-slate-700 bg-surface-elevated px-3 py-2 text-xs font-medium text-slate-400">
                  Impacted nodes
                </div>
                {blast.nodes.filter((n) => n.depth > 0).map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      setSelected({
                        id: n.id,
                        label: n.name,
                        type: n.ciType,
                        healthScore: n.healthScore,
                        riskScore: n.riskScore,
                      });
                      cyRef.current?.$(`#${CSS.escape(n.id)}`).select();
                    }}
                    className="flex w-full items-center justify-between border-b border-slate-800 px-3 py-2 text-left text-sm hover:bg-slate-800/50"
                  >
                    <div>
                      <div className="font-medium">{n.name}</div>
                      <div className="text-xs text-slate-500">{n.ciType} · depth {n.depth}</div>
                    </div>
                    <span className={clsx('text-xs font-medium', n.healthScore < 70 ? 'text-red-400' : n.riskScore >= 50 ? 'text-amber-400' : 'text-emerald-400')}>
                      H{n.healthScore}
                    </span>
                  </button>
                ))}
                {blast.affectedCis === 0 && (
                  <p className="px-3 py-6 text-center text-sm text-slate-500">No dependent CIs in range</p>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-slate-700 bg-surface-elevated p-5 text-sm text-slate-400">
              <Network className="mb-3 text-primary" size={24} />
              <p className="font-medium text-slate-200">Impact analysis</p>
              <p className="mt-2">
                Select a node on the graph, set depth and direction, then run blast-radius analysis.
                Downstream shows what the CI depends on; upstream shows what depends on it.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
