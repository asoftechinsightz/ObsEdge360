'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import {
  Network,
  RefreshCw,
  Crosshair,
  AlertTriangle,
  Shield,
  Bot,
  Clock,
  Users,
  Activity,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { friendlyError } from '@/lib/friendly-error';
import { DemoAwareEmptyState } from '@/components/ede/DemoAwareEmptyState';
import cytoscape from 'cytoscape';
import clsx from 'clsx';

interface TwinNode {
  id: string;
  label: string;
  type: string;
  status?: string;
  healthScore?: number;
  riskScore?: number;
  serviceId?: string;
}

interface TwinEdge {
  source: string;
  target: string;
  type?: string;
  strength?: string;
}

interface BusinessService {
  id: string;
  name: string;
  businessUnit?: string;
  businessCapability?: string;
  environment?: string;
  tier: number;
  criticality: string;
  lifecycle: string;
  tags: string[];
  health: string;
  healthScore: number;
  riskScore: number;
  ownership: {
    businessOwner?: string;
    technicalOwner?: string;
    operationsOwner?: string;
    supportTeam?: string;
    escalationGroup?: string;
    onCallTeam?: string;
  };
  sla: {
    target: number;
    actual: number;
    compliance: number;
    breachPredicted: boolean;
    trend: string;
  };
  kpis: {
    availability: number;
    latencyMs: number;
    errorRate: number;
    incidentCount: number;
    mttrMinutes: number;
    slaCompliance: number;
    businessRisk: string;
    revenueImpactPerHour: number;
    customerImpact: string;
    trend: string;
    forecastRisk: string;
  };
  dependencyCount: number;
  twinHref: string;
  observeHref: string;
}

interface ServiceBlast {
  serviceId: string;
  serviceName: string;
  affectedServices: string[];
  affectedApplications: string[];
  affectedCustomers: string;
  businessRisk: string;
  revenueImpactPerHour: number;
  operationalImpact: string;
  priority: string;
  recoveryOrder: string[];
  affectedCis: number;
  criticalCount: number;
  atRiskCount: number;
  avgHealth: number;
  nodes: Array<{
    id: string;
    name: string;
    ciType: string;
    healthScore: number;
    riskScore: number;
    depth: number;
    status: string;
  }>;
  rootCiIds: string[];
}

interface CiBlast {
  rootCiId: string;
  rootCiName: string;
  rootCiType: string;
  affectedCis: number;
  criticalCount: number;
  atRiskCount: number;
  avgHealth: number;
  nodes: Array<{ id: string; name: string; ciType: string; healthScore: number; riskScore: number; depth: number }>;
  source?: string;
}

interface ExecutiveRisk {
  businessHealth: string;
  businessHealthScore: number;
  topRisks: Array<{ id: string; title: string; severity: string; href: string }>;
  revenueImpactPerHour: number;
  customerImpact: string;
  openIncidents: number;
  complianceStatus: string;
  recommendations: Array<{ id: string; title: string; href: string }>;
}

interface TwinAi {
  summary: string;
  evidence: Array<{ type: string; ref: string; detail: string }>;
  confidence: number;
  businessImpact: string;
  affectedServices: string[];
  rootCause: string;
  recommendedRemediation: string[];
  automationRecommendations: string[];
  recoveryOrder: string[];
}

type LayoutName = 'breadthfirst' | 'cose' | 'circle' | 'grid';
type InspectorTab = 'overview' | 'blast' | 'ai' | 'history';

function healthColor(score?: number) {
  if (score == null) return '#0ea5e9';
  if (score >= 90) return '#34d399';
  if (score >= 70) return '#fbbf24';
  return '#f87171';
}

function healthBadge(h: string) {
  if (h === 'healthy') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (h === 'degraded') return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  if (h === 'critical') return 'bg-red-500/15 text-red-300 border-red-500/30';
  return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
}

export default function DigitalTwinPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <div className="p-6 text-sm text-slate-400">Loading Digital Twin…</div>
        </DashboardShell>
      }
    >
      <DigitalTwinInner />
    </Suspense>
  );
}

function DigitalTwinInner() {
  const search = useSearchParams();
  const workflowRan = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  const [services, setServices] = useState<BusinessService[]>([]);
  const [activeService, setActiveService] = useState<BusinessService | null>(null);
  const [nodes, setNodes] = useState<TwinNode[]>([]);
  const [edges, setEdges] = useState<TwinEdge[]>([]);
  const [selected, setSelected] = useState<TwinNode | null>(null);
  const [serviceBlast, setServiceBlast] = useState<ServiceBlast | null>(null);
  const [ciBlast, setCiBlast] = useState<CiBlast | null>(null);
  const [execRisk, setExecRisk] = useState<ExecutiveRisk | null>(null);
  const [ai, setAi] = useState<TwinAi | null>(null);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [layout, setLayout] = useState<LayoutName>('breadthfirst');
  const [depth, setDepth] = useState(3);
  const [direction, setDirection] = useState<'downstream' | 'upstream' | 'both'>('downstream');
  const [tab, setTab] = useState<InspectorTab>('overview');

  const renderGraph = useCallback(
    (graphNodes: TwinNode[], graphEdges: TwinEdge[], highlightIds?: Set<string>, rootId?: string) => {
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
            isRoot: rootId === n.id || rootId === `bs:${n.serviceId}` ? 1 : 0,
            isBs: n.type === 'business_service' || n.id.startsWith('bs:') ? 1 : 0,
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
              width: 34,
              height: 34,
              'border-width': 2,
              'border-color': '#1e293b',
              opacity: highlightIds ? 0.28 : 1,
            },
          },
          {
            selector: 'node[isBs = 1]',
            style: {
              'background-color': '#a78bfa',
              width: 52,
              height: 52,
              'font-size': 11,
              'font-weight': 600,
            },
          },
          { selector: 'node[type = "database"]', style: { 'background-color': '#f59e0b' } },
          { selector: 'node[type = "application"]', style: { 'background-color': '#06b6d4' } },
          { selector: 'node[type = "kubernetes"]', style: { 'background-color': '#22d3ee' } },
          { selector: 'node[healthScore < 80]', style: { 'background-color': '#ef4444' } },
          {
            selector: 'node[highlight = 1]',
            style: {
              opacity: 1,
              'border-width': 3,
              'border-color': '#f97316',
              width: 46,
              height: 46,
            },
          },
          {
            selector: 'node[isRoot = 1]',
            style: {
              opacity: 1,
              'border-width': 4,
              'border-color': '#f43f5e',
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
              opacity: highlightIds ? 0.15 : 0.75,
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
          padding: 36,
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
        if (evt.target === cy) setSelected(null);
      });

      cyRef.current = cy;
    },
    [layout],
  );

  const loadEnterprise = useCallback(
    async (serviceId?: string) => {
      setLoading(true);
      setServiceBlast(null);
      setCiBlast(null);
      try {
        const params = new URLSearchParams({ view: 'enterprise', limit: '180' });
        if (serviceId) params.set('serviceId', serviceId);
        const [graph, svcRes, risk] = await Promise.all([
          apiClient<{ nodes: TwinNode[]; edges: TwinEdge[] }>(`/twin/graph?${params}`),
          apiClient<{ items: BusinessService[] }>('/twin/business-services'),
          apiClient<ExecutiveRisk>('/twin/executive-risk').catch(() => null),
        ]);
        setNodes(graph.nodes || []);
        setEdges(graph.edges || []);
        setServices(svcRes.items || []);
        if (risk) setExecRisk(risk);
        renderGraph(graph.nodes || [], graph.edges || []);

        const preferredId = serviceId || search.get('serviceId');
        const preferredName = (search.get('name') || '').toLowerCase();
        const match =
          (preferredId && (svcRes.items || []).find((s) => s.id === preferredId)) ||
          (preferredName &&
            (svcRes.items || []).find((s) => s.name.toLowerCase().includes(preferredName))) ||
          (svcRes.items || [])[0] ||
          null;
        if (match) setActiveService(match);
      } catch (err) {
        setMessage(
          friendlyError(
            err,
            'Digital Twin has no graph yet. Load Illustrative Demo Data to seed business services and relationships.',
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [renderGraph, search],
  );

  useEffect(() => {
    void loadEnterprise(search.get('serviceId') || undefined);
  }, [loadEnterprise, search]);

  useEffect(() => {
    if (workflowRan.current) return;
    if (!activeService) return;
    if (search.get('workflow') !== 'impact' && !search.get('serviceId') && !search.get('name')) return;
    workflowRan.current = true;
    void runServiceBlast(activeService.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeService, search]);

  useEffect(() => {
    if (!nodes.length) return;
    const highlight =
      serviceBlast?.nodes?.length
        ? new Set([...serviceBlast.nodes.map((n) => n.id), ...serviceBlast.rootCiIds, `bs:${serviceBlast.serviceId}`])
        : ciBlast?.nodes?.length
          ? new Set(ciBlast.nodes.map((n) => n.id))
          : undefined;
    const root =
      serviceBlast?.serviceId
        ? `bs:${serviceBlast.serviceId}`
        : ciBlast?.rootCiId;
    renderGraph(nodes, edges, highlight, root);
  }, [layout]); // eslint-disable-line react-hooks/exhaustive-deps

  async function selectService(svc: BusinessService) {
    setActiveService(svc);
    setTab('overview');
    setAi(null);
    setHistory([]);
    setCiBlast(null);
    setServiceBlast(null);
    await loadEnterprise(svc.id);
  }

  async function runServiceBlast(serviceId?: string) {
    const id = serviceId || activeService?.id;
    if (!id) {
      setMessage('Select a business service first');
      return;
    }
    setAnalyzing(true);
    setTab('blast');
    try {
      const result = await apiClient<ServiceBlast>(
        `/twin/business-services/${id}/blast-radius?depth=${depth}&direction=${direction}`,
      );
      setServiceBlast(result);
      setCiBlast(null);
      const ids = new Set([
        ...result.nodes.map((n) => n.id),
        ...result.rootCiIds,
        `bs:${result.serviceId}`,
      ]);
      renderGraph(nodes, edges, ids, `bs:${result.serviceId}`);
      setMessage(
        `Blast radius · ${result.serviceName}: ${result.affectedCis} CIs · ${result.priority} · ₹${result.revenueImpactPerHour.toLocaleString()}/hr`,
      );
      void apiClient(`/twin/business-services/${id}/snapshot`, { method: 'POST', body: '{}' }).catch(() => undefined);
    } catch (err) {
      setMessage(friendlyError(err, 'Business service blast radius is unavailable.'));
    } finally {
      setAnalyzing(false);
    }
  }

  async function analyzeCi(ciId?: string) {
    const id = ciId ?? selected?.id;
    if (!id || id.startsWith('bs:')) {
      if (id?.startsWith('bs:')) return runServiceBlast(id.slice(3));
      setMessage('Select a configuration item or business service');
      return;
    }
    setAnalyzing(true);
    setTab('blast');
    try {
      const result = await apiClient<CiBlast>(`/twin/blast-radius/${id}?depth=${depth}&direction=${direction}`);
      setCiBlast(result);
      setServiceBlast(null);
      const ids = new Set(result.nodes.map((n) => n.id));
      renderGraph(nodes, edges, ids, result.rootCiId);
      setMessage(`CI blast radius: ${result.affectedCis} affected within depth ${depth}`);
    } catch (err) {
      setMessage(friendlyError(err, 'Impact analysis is unavailable for this node.'));
    } finally {
      setAnalyzing(false);
    }
  }

  async function runTwinAi() {
    if (!activeService) {
      setMessage('Select a business service for Twin-grounded AI');
      return;
    }
    setAiLoading(true);
    setTab('ai');
    try {
      const result = await apiClient<TwinAi>('/twin/ai/explain', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: activeService.id,
          name: activeService.name,
          prompt: 'What is the blast radius and recovery order?',
        }),
      });
      setAi(result);
    } catch (err) {
      setMessage(friendlyError(err, 'Twin AI explanation failed.'));
    } finally {
      setAiLoading(false);
    }
  }

  async function loadHistory() {
    if (!activeService) return;
    setTab('history');
    try {
      const res = await apiClient<{ items: Array<Record<string, unknown>> }>(
        `/twin/business-services/${activeService.id}/history?hours=24`,
      );
      setHistory(res.items || []);
      if (!(res.items || []).length) {
        await apiClient(`/twin/business-services/${activeService.id}/snapshot`, {
          method: 'POST',
          body: '{}',
        }).catch(() => undefined);
        const again = await apiClient<{ items: Array<Record<string, unknown>> }>(
          `/twin/business-services/${activeService.id}/history?hours=24`,
        );
        setHistory(again.items || []);
      }
    } catch (err) {
      setMessage(friendlyError(err, 'Health history is unavailable (time-travel MVP).'));
    }
  }

  function clearBlast() {
    setServiceBlast(null);
    setCiBlast(null);
    renderGraph(nodes, edges);
    setMessage('');
  }

  return (
    <DashboardShell>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-violet-300/80">Business Operations Intelligence</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-50">Enterprise Digital Twin</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Business services · dependencies · health propagation · blast radius · ownership · SLA · Twin-grounded AI
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadEnterprise(activeService?.id)}
            className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => runServiceBlast()}
            disabled={!activeService || analyzing}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <Crosshair size={16} /> {analyzing ? 'Analyzing…' : 'Blast radius'}
          </button>
          <button
            type="button"
            onClick={() => runTwinAi()}
            disabled={!activeService || aiLoading}
            className="flex items-center gap-2 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-sm text-violet-200 disabled:opacity-50"
          >
            <Bot size={16} /> {aiLoading ? 'Reasoning…' : 'Twin AI'}
          </button>
          {(serviceBlast || ciBlast) && (
            <button
              type="button"
              onClick={clearBlast}
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800"
            >
              Clear highlight
            </button>
          )}
        </div>
      </div>

      {execRisk && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-700 bg-surface-elevated p-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Business health</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-semibold">{execRisk.businessHealthScore}</span>
              <span className={clsx('rounded border px-1.5 py-0.5 text-[10px]', healthBadge(execRisk.businessHealth))}>
                {execRisk.businessHealth}
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-surface-elevated p-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Revenue at risk</div>
            <div className="mt-1 text-2xl font-semibold text-amber-300">
              ₹{Math.round(execRisk.revenueImpactPerHour).toLocaleString()}
              <span className="text-xs font-normal text-slate-500">/hr</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-surface-elevated p-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Open incidents</div>
            <div className="mt-1 text-2xl font-semibold">{execRisk.openIncidents}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-surface-elevated p-3 sm:col-span-2">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Top twin risks</div>
            <ul className="mt-1 space-y-1">
              {(execRisk.topRisks || []).slice(0, 2).map((r) => (
                <li key={r.id}>
                  <Link href={r.href || '/twin'} className="text-sm text-slate-200 hover:text-primary">
                    {r.title}
                  </Link>
                </li>
              ))}
              {!execRisk.topRisks?.length && (
                <li className="text-sm text-slate-500">No elevated twin risks</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-lg border border-slate-600 bg-surface-elevated px-4 py-2 text-sm text-slate-300">
          {message}
          <button type="button" className="ml-3 text-slate-500 hover:text-white" onClick={() => setMessage('')}>
            ×
          </button>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <select
          value={layout}
          onChange={(e) => setLayout(e.target.value as LayoutName)}
          className="rounded-lg border border-slate-600 bg-surface px-2 py-1.5"
        >
          <option value="breadthfirst">Breadth-first</option>
          <option value="cose">Force-directed</option>
          <option value="circle">Circle</option>
          <option value="grid">Grid</option>
        </select>
        <label className="flex items-center gap-2 text-slate-400">
          Depth
          <select
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="rounded-lg border border-slate-600 bg-surface px-2 py-1.5 text-slate-100"
          >
            {[1, 2, 3, 4, 5, 6].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as typeof direction)}
          className="rounded-lg border border-slate-600 bg-surface px-2 py-1.5"
        >
          <option value="downstream">Downstream</option>
          <option value="upstream">Upstream</option>
          <option value="both">Both</option>
        </select>
        <span className="text-xs text-slate-500">
          {services.length} services · {nodes.length} nodes · {edges.length} edges
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        {/* Business services */}
        <div className="xl:col-span-3 max-h-[720px] overflow-y-auto rounded-xl border border-slate-700 bg-surface-elevated">
          <div className="sticky top-0 z-10 border-b border-slate-700 bg-surface-elevated px-3 py-2 text-xs font-medium text-slate-400">
            Business services
          </div>
          {!loading && services.length === 0 && (
            <div className="p-3">
              <DemoAwareEmptyState
                title="No business services yet"
                hint="Load Illustrative Demo Data to seed Banking360 services, ownership, and service maps."
                setupHref="/demo/guided"
              />
            </div>
          )}
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => void selectService(s)}
              className={clsx(
                'flex w-full items-start justify-between gap-2 border-b border-slate-800 px-3 py-2.5 text-left hover:bg-slate-800/50',
                activeService?.id === s.id && 'bg-violet-500/10',
              )}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-100">{s.name}</div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  T{s.tier} · {s.businessCapability || s.businessUnit || 'Service'} · {s.dependencyCount} deps
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {s.ownership.operationsOwner || s.ownership.businessOwner || 'Owner unassigned'}
                </div>
              </div>
              <span className={clsx('shrink-0 rounded border px-1.5 py-0.5 text-[10px]', healthBadge(s.health))}>
                {s.healthScore}
              </span>
            </button>
          ))}
        </div>

        {/* Graph */}
        <div className="xl:col-span-5">
          {loading && <p className="mb-2 text-sm text-slate-400">Loading enterprise twin…</p>}
          {!loading && nodes.length === 0 && (
            <div className="mb-3">
              <DemoAwareEmptyState
                title="No digital twin graph yet"
                hint="The twin is built from business services, service maps, and CMDB relationships."
                setupHref="/discovery"
              />
            </div>
          )}
          <div
            ref={containerRef}
            className={clsx(
              'h-[560px] rounded-xl border border-slate-700 bg-[#0b1220]',
              !loading && nodes.length === 0 && 'hidden',
            )}
          />
          {selected && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700 bg-surface-elevated p-3 text-sm">
              <div>
                <span className="font-medium">{selected.label}</span>
                <span className="ml-2 text-slate-400">{selected.type}</span>
                {selected.healthScore != null && (
                  <span className="ml-2" style={{ color: healthColor(selected.healthScore) }}>
                    Health {selected.healthScore}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => void analyzeCi(selected.id)}
                className="text-primary hover:underline"
              >
                Analyze node impact
              </button>
            </div>
          )}
        </div>

        {/* Inspector */}
        <div className="xl:col-span-4 space-y-3">
          <div className="flex flex-wrap gap-1 rounded-lg border border-slate-700 bg-surface p-1 text-xs">
            {(
              [
                ['overview', 'Overview'],
                ['blast', 'Blast'],
                ['ai', 'AI'],
                ['history', 'History'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTab(id);
                  if (id === 'history') void loadHistory();
                  if (id === 'ai' && !ai) void runTwinAi();
                }}
                className={clsx(
                  'rounded-md px-2.5 py-1.5',
                  tab === id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {!activeService && (
            <div className="rounded-xl border border-slate-700 bg-surface-elevated p-5 text-sm text-slate-400">
              <Network className="mb-3 text-violet-300" size={24} />
              <p className="font-medium text-slate-200">Select a business service</p>
              <p className="mt-2">
                Inspect dependencies, ownership, SLA, blast radius, and Twin-grounded AI from one screen.
              </p>
            </div>
          )}

          {activeService && tab === 'overview' && (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-700 bg-surface-elevated p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-50">{activeService.name}</h2>
                    <p className="text-xs text-slate-500">
                      {activeService.businessUnit} · {activeService.businessCapability} · {activeService.environment}
                    </p>
                  </div>
                  <span className={clsx('rounded border px-2 py-0.5 text-xs', healthBadge(activeService.health))}>
                    {activeService.health}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <Stat label="Availability" value={`${activeService.kpis.availability}%`} />
                  <Stat label="SLA target" value={`${activeService.sla.target}%`} />
                  <Stat label="Latency" value={`${activeService.kpis.latencyMs} ms`} />
                  <Stat label="Error rate" value={`${activeService.kpis.errorRate}%`} />
                  <Stat label="MTTR" value={`${activeService.kpis.mttrMinutes} m`} />
                  <Stat
                    label="Revenue"
                    value={`₹${activeService.kpis.revenueImpactPerHour.toLocaleString()}/hr`}
                  />
                </div>
                {activeService.sla.breachPredicted && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-amber-300">
                    <AlertTriangle size={12} /> SLA breach predicted
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-400">{activeService.kpis.customerImpact}</p>
                <p className="mt-1 text-xs text-slate-500">Forecast: {activeService.kpis.forecastRisk}</p>
              </div>

              <div className="rounded-xl border border-slate-700 bg-surface-elevated p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400">
                  <Users size={14} /> Ownership
                </div>
                <dl className="space-y-1.5 text-sm">
                  <OwnerRow label="Business" value={activeService.ownership.businessOwner} />
                  <OwnerRow label="Technical" value={activeService.ownership.technicalOwner} />
                  <OwnerRow label="Operations" value={activeService.ownership.operationsOwner} />
                  <OwnerRow label="Support" value={activeService.ownership.supportTeam} />
                  <OwnerRow label="Escalation" value={activeService.ownership.escalationGroup} />
                  <OwnerRow label="On-call" value={activeService.ownership.onCallTeam} />
                </dl>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <Link
                  href={activeService.observeHref}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-2.5 py-1.5 hover:bg-slate-800"
                >
                  <Activity size={12} /> Observability <ChevronRight size={12} />
                </Link>
                <Link
                  href="/ops-intelligence"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-2.5 py-1.5 hover:bg-slate-800"
                >
                  Incidents <ChevronRight size={12} />
                </Link>
                <Link
                  href="/cmdb/drift"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-2.5 py-1.5 hover:bg-slate-800"
                >
                  Changes <ChevronRight size={12} />
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-2.5 py-1.5 hover:bg-slate-800"
                >
                  Executive Home <ChevronRight size={12} />
                </Link>
              </div>
            </div>
          )}

          {tab === 'blast' && (serviceBlast || ciBlast) && (
            <div className="space-y-3">
              {serviceBlast && (
                <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-orange-300">
                    <AlertTriangle size={16} />
                    <span className="font-medium">Business blast radius</span>
                    <span className="ml-auto rounded border border-orange-400/40 px-1.5 text-[10px]">
                      {serviceBlast.priority}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{serviceBlast.serviceName}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <Stat label="Affected CIs" value={String(serviceBlast.affectedCis)} />
                    <Stat label="Critical" value={String(serviceBlast.criticalCount)} accent="text-red-400" />
                    <Stat
                      label="Revenue impact"
                      value={`₹${serviceBlast.revenueImpactPerHour.toLocaleString()}/hr`}
                      accent="text-amber-300"
                    />
                    <Stat label="Avg health" value={String(serviceBlast.avgHealth)} />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{serviceBlast.operationalImpact}</p>
                  <p className="mt-1 text-xs text-slate-500">Customers: {serviceBlast.affectedCustomers}</p>
                  {!!serviceBlast.affectedApplications.length && (
                    <p className="mt-2 text-xs text-slate-400">
                      Apps: {serviceBlast.affectedApplications.slice(0, 6).join(', ')}
                    </p>
                  )}
                  <div className="mt-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Recovery order</div>
                    <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-sm text-slate-200">
                      {serviceBlast.recoveryOrder.slice(0, 8).map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
              {ciBlast && !serviceBlast && (
                <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-orange-300">
                    <Shield size={16} />
                    <span className="font-medium">CI blast radius</span>
                  </div>
                  <p className="text-sm">
                    Root: <span className="font-medium">{ciBlast.rootCiName}</span>
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <Stat label="Affected" value={String(ciBlast.affectedCis)} />
                    <Stat label="Critical" value={String(ciBlast.criticalCount)} accent="text-red-400" />
                  </div>
                </div>
              )}
              <div className="max-h-[280px] overflow-y-auto rounded-xl border border-slate-700 bg-surface-elevated">
                <div className="sticky top-0 border-b border-slate-700 bg-surface-elevated px-3 py-2 text-xs font-medium text-slate-400">
                  Impacted nodes
                </div>
                {(serviceBlast?.nodes || ciBlast?.nodes || [])
                  .filter((n) => n.depth > 0)
                  .slice(0, 40)
                  .map((n) => (
                    <div
                      key={n.id}
                      className="flex items-center justify-between border-b border-slate-800 px-3 py-2 text-sm"
                    >
                      <div>
                        <div className="font-medium">{n.name}</div>
                        <div className="text-xs text-slate-500">
                          {n.ciType} · depth {n.depth}
                        </div>
                      </div>
                      <span
                        className={clsx(
                          'text-xs font-medium',
                          n.healthScore < 70 ? 'text-red-400' : n.healthScore < 85 ? 'text-amber-400' : 'text-emerald-400',
                        )}
                      >
                        H{n.healthScore}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {tab === 'blast' && !serviceBlast && !ciBlast && (
            <div className="rounded-xl border border-slate-700 bg-surface-elevated p-5 text-sm text-slate-400">
              <Crosshair className="mb-3 text-primary" size={22} />
              <p className="font-medium text-slate-200">Run blast radius</p>
              <p className="mt-2">
                Analyze from the selected business service to see affected applications, revenue impact, and recovery
                order.
              </p>
            </div>
          )}

          {tab === 'ai' && (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-violet-200">
                <Sparkles size={16} />
                <span className="font-medium">Twin-grounded AI</span>
              </div>
              {!ai && (
                <p className="text-sm text-slate-400">
                  {aiLoading ? 'Reasoning over twin relationships…' : 'Ask Twin AI after selecting a business service.'}
                </p>
              )}
              {ai && (
                <div className="space-y-3 text-sm">
                  <p className="text-slate-100">{ai.summary}</p>
                  <p className="text-xs text-slate-400">
                    Confidence {(ai.confidence * 100).toFixed(0)}% · Impact {ai.businessImpact}
                  </p>
                  <div>
                    <div className="text-[11px] uppercase text-slate-500">Evidence</div>
                    <ul className="mt-1 space-y-1 text-xs text-slate-300">
                      {ai.evidence.map((e, i) => (
                        <li key={`${e.ref}-${i}`}>
                          <span className="text-slate-500">[{e.type}]</span> {e.detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase text-slate-500">Remediation</div>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-slate-300">
                      {ai.recommendedRemediation.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase text-slate-500">Automation (approval required)</div>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-slate-300">
                      {ai.automationRecommendations.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'history' && (
            <div className="rounded-xl border border-slate-700 bg-surface-elevated p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400">
                <Clock size={14} /> Health history (time-travel MVP)
              </div>
              {!history.length && <p className="text-sm text-slate-500">No snapshots yet for this service.</p>}
              <ul className="max-h-[420px] space-y-2 overflow-y-auto">
                {history.map((h, i) => (
                  <li key={i} className="rounded-lg border border-slate-800 bg-surface px-3 py-2 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-slate-200">Score {String(h.health_score)}</span>
                      <span className="text-slate-500">
                        {h.recorded_at ? new Date(String(h.recorded_at)).toLocaleString() : '—'}
                      </span>
                    </div>
                    <div className="mt-1 text-slate-400">
                      Avail {String(h.availability)}% · SLA {String(h.sla_compliance)}% · Risk {String(h.business_risk)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg bg-surface p-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={clsx('text-sm font-semibold', accent)}>{value}</div>
    </div>
  );
}

function OwnerRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={clsx('text-right', value ? 'text-slate-200' : 'text-amber-400/80')}>
        {value || 'Unassigned'}
      </dd>
    </div>
  );
}
