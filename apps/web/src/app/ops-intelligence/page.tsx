'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Brain, RefreshCw, Crosshair, AlertTriangle, TrendingUp, Shield,
} from 'lucide-react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import clsx from 'clsx';

interface Health {
  openIncidents: number;
  openAnomalies: number;
  rcaSessions24h: number;
  pendingRemediation: number;
  forecasts24h: number;
  signals24h: number;
}

interface Incident {
  id: string;
  title: string;
  severity: string;
  status: string;
  signalCounts?: { total?: number; alerts?: number; anomalies?: number };
  createdAt?: string;
}

interface RcaSession {
  id: string;
  summary: string;
  confidencePct: number;
  insufficientSignal?: boolean;
  hypotheses?: Array<{ hypothesis: string; confidence_pct?: number; confidencePct?: number; rank: number }>;
}

export default function OpsIntelligencePage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [signals, setSignals] = useState<Array<Record<string, unknown>>>([]);
  const [rca, setRca] = useState<RcaSession | null>(null);
  const [approvals, setApprovals] = useState<Array<Record<string, unknown>>>([]);
  const [capacityForecasts, setCapacityForecasts] = useState<Array<Record<string, unknown>>>([]);
  const [predictions, setPredictions] = useState<Array<Record<string, unknown>>>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Incident | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [h, inc, sig, appr, cap, pred] = await Promise.all([
        apiClient<Health>('/ops-intelligence/health'),
        apiClient<{ incidents: Incident[] }>('/ops-intelligence/incidents'),
        apiClient<{ signals: Array<Record<string, unknown>> }>('/ops-intelligence/signals'),
        apiClient<{ approvals: Array<Record<string, unknown>> }>('/ops-intelligence/remediation/approvals'),
        apiClient<{ forecasts: Array<Record<string, unknown>> }>('/ops-intelligence/capacity/forecasts'),
        apiClient<{ predictions: Array<Record<string, unknown>> }>('/ops-intelligence/predictions'),
      ]);
      setHealth(h);
      setIncidents(inc.incidents ?? []);
      setSignals(sig.signals ?? []);
      setApprovals(appr.approvals ?? []);
      setCapacityForecasts(cap.forecasts ?? []);
      setPredictions(pred.predictions ?? []);
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function correlate() {
    setMessage('Correlating…');
    try {
      const r = await apiClient<{ incidentsCreated: number }>('/ops-intelligence/correlate', {
        method: 'POST',
        body: JSON.stringify({ windowMinutes: 60 }),
      });
      setMessage(`Correlated ${r.incidentsCreated} new incident(s)`);
      await load();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function scanAnomalies() {
    setMessage('Scanning anomalies…');
    try {
      const r = await apiClient<{ anomaliesCreated: number; baselinesUpdated: number }>(
        '/ops-intelligence/anomalies/scan',
        { method: 'POST', body: JSON.stringify({ windowMinutes: 60 }) },
      );
      setMessage(`Anomaly scan: ${r.anomaliesCreated} anomalies, ${r.baselinesUpdated} baselines`);
      await load();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function predictiveScan() {
    setMessage('Running predictive anomaly scan…');
    try {
      const r = await apiClient<{ anomaliesCreated: number; modelVersion: string }>(
        '/ops-intelligence/predictive/scan',
        { method: 'POST', body: JSON.stringify({ lookbackHours: 6, horizonHours: 24 }) },
      );
      setMessage(`Predictive scan (${r.modelVersion}): ${r.anomaliesCreated} anomalies`);
      await load();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function generateForecasts() {
    setMessage('Generating trend forecasts…');
    try {
      const r = await apiClient<{ generated: number }>('/ops-intelligence/forecasts/generate', {
        method: 'POST',
        body: JSON.stringify({ horizonHours: 24 }),
      });
      setMessage(`Generated ${r.generated} trend forecast(s)`);
      await load();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function capacityForecast() {
    setMessage('Generating capacity forecasts…');
    try {
      const r = await apiClient<{
        generated: number;
        breachesPredicted: number;
        modelVersion: string;
      }>('/ops-intelligence/capacity/forecast', {
        method: 'POST',
        body: JSON.stringify({ horizonHours: 168, lookbackHours: 24 }),
      });
      setMessage(
        `Capacity (${r.modelVersion}): ${r.generated} forecasts, ${r.breachesPredicted} breach ETA(s)`,
      );
      await load();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function runRca(incident?: Incident) {
    setMessage('Running RCA…');
    try {
      const session = await apiClient<RcaSession>('/ops-intelligence/rca', {
        method: 'POST',
        body: JSON.stringify({
          question: incident
            ? `Root cause for incident: ${incident.title}`
            : 'What is the most likely active root cause?',
          incidentId: incident?.id,
        }),
      });
      setRca(session);
      setMessage(`RCA confidence ${session.confidencePct}%`);
      await load();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function requestRemediation(mode: 'dry_run' | 'live' = 'dry_run') {
    if (!selected) {
      setMessage('Select an incident first');
      return;
    }
    try {
      const riskTier = selected.severity === 'critical' ? 'high' : 'medium';
      const req = await apiClient<{
        id: string;
        requiresApproval?: boolean;
        status?: string;
        executionMode?: string;
      }>('/ops-intelligence/remediation/request', {
        method: 'POST',
        body: JSON.stringify({
          action: `Investigate and stabilize: ${selected.title}`,
          actionKey: mode === 'live' ? 'restart_service' : 'investigate_stabilize',
          incidentId: selected.id,
          riskTier: mode === 'live' ? 'medium' : riskTier,
          executionMode: mode,
          evidence: 'Requested from Ops Intelligence UI',
        }),
      });
      setMessage(
        `Remediation requested (${req.executionMode}) · ${req.requiresApproval ? 'awaiting approval' : 'ready'} · ${req.id}`,
      );
      await load();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function approveRemediation(id: string) {
    try {
      await apiClient(`/ops-intelligence/remediation/approvals/${id}/approve`, {
        method: 'POST',
        body: '{}',
      });
      setMessage(`Approved ${id}`);
      await load();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function rejectRemediation(id: string) {
    try {
      await apiClient(`/ops-intelligence/remediation/approvals/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Rejected from Ops Intelligence UI' }),
      });
      setMessage(`Rejected ${id}`);
      await load();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function executeRemediation(id: string) {
    try {
      const r = await apiClient<{ status: string; executionMode?: string }>(
        `/ops-intelligence/remediation/approvals/${id}/execute`,
        { method: 'POST', body: '{}' },
      );
      setMessage(`Executed · ${r.status} (${r.executionMode})`);
      await load();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  return (
    <DashboardShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100 flex items-center gap-2">
              <Brain className="h-6 w-6 text-violet-400" /> Operations Intelligence
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Correlation, RCA, predictive anomalies, capacity forecasts, and controlled remediation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void correlate()} className="rounded-md bg-violet-600/80 px-3 py-1.5 text-sm text-white hover:bg-violet-500">
              Correlate
            </button>
            <button type="button" onClick={() => void scanAnomalies()} className="rounded-md bg-amber-600/80 px-3 py-1.5 text-sm text-white hover:bg-amber-500">
              Scan anomalies
            </button>
            <button type="button" onClick={() => void predictiveScan()} className="rounded-md bg-orange-600/80 px-3 py-1.5 text-sm text-white hover:bg-orange-500">
              Predictive scan
            </button>
            <button type="button" onClick={() => void generateForecasts()} className="rounded-md bg-emerald-600/80 px-3 py-1.5 text-sm text-white hover:bg-emerald-500">
              Trend forecasts
            </button>
            <button type="button" onClick={() => void capacityForecast()} className="rounded-md bg-teal-600/80 px-3 py-1.5 text-sm text-white hover:bg-teal-500">
              Capacity 7d
            </button>
            <button type="button" onClick={() => void runRca()} className="rounded-md bg-sky-600/80 px-3 py-1.5 text-sm text-white hover:bg-sky-500">
              Run RCA
            </button>
            <button type="button" onClick={() => void load()} className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500">
              <RefreshCw className={clsx('h-4 w-4 inline', loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {message && (
          <div className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">{message}</div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { label: 'Open incidents', value: health?.openIncidents, icon: AlertTriangle },
            { label: 'Open anomalies', value: health?.openAnomalies, icon: Crosshair },
            { label: 'RCA 24h', value: health?.rcaSessions24h, icon: Brain },
            { label: 'Pending rem.', value: health?.pendingRemediation, icon: Shield },
            { label: 'Forecasts 24h', value: health?.forecasts24h, icon: TrendingUp },
            { label: 'Signals 24h', value: health?.signals24h, icon: RefreshCw },
          ].map((k) => (
            <div key={k.label} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <k.icon className="h-3.5 w-3.5" /> {k.label}
              </div>
              <div className="mt-1 text-xl font-semibold text-slate-100">{k.value ?? '—'}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <h2 className="text-sm font-medium text-slate-200 mb-2">Correlated incidents</h2>
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {incidents.length === 0 && <p className="text-xs text-slate-500">No incidents — run Correlate after alerts/anomalies exist.</p>}
              {incidents.map((inc) => (
                <button
                  key={inc.id}
                  type="button"
                  onClick={() => setSelected(inc)}
                  className={clsx(
                    'w-full text-left rounded-md border px-3 py-2 text-sm',
                    selected?.id === inc.id
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-slate-800 hover:border-slate-600',
                  )}
                >
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-100 font-medium truncate">{inc.title}</span>
                    <span className="text-xs uppercase text-slate-400">{inc.severity}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    signals {inc.signalCounts?.total ?? 0} · {inc.status}
                  </div>
                </button>
              ))}
            </div>
            {selected && (
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => void runRca(selected)} className="rounded-md bg-sky-700 px-2 py-1 text-xs text-white">
                  RCA this
                </button>
                <button type="button" onClick={() => void requestRemediation('dry_run')} className="rounded-md bg-rose-700/80 px-2 py-1 text-xs text-white">
                  Request dry-run
                </button>
                <button type="button" onClick={() => void requestRemediation('live')} className="rounded-md bg-orange-800/80 px-2 py-1 text-xs text-white">
                  Request live
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <h2 className="text-sm font-medium text-slate-200 mb-2">Latest RCA</h2>
              {rca ? (
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="text-slate-200">Confidence {rca.confidencePct}%</div>
                  {rca.insufficientSignal && <div className="text-amber-400">Insufficient signal</div>}
                  <pre className="whitespace-pre-wrap text-slate-300">{rca.summary}</pre>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Run RCA to populate</p>
              )}
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <h2 className="text-sm font-medium text-slate-200 mb-2">Signals</h2>
              <ul className="space-y-1 max-h-40 overflow-y-auto text-xs text-slate-400">
                {signals.slice(0, 15).map((s) => (
                  <li key={String(s.id)} className="truncate">
                    <span className="text-slate-500">{String(s.signal_type)}</span> · {String(s.title)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <h2 className="text-sm font-medium text-slate-200 mb-2">Capacity forecasts</h2>
              <ul className="space-y-1 max-h-36 overflow-y-auto text-xs text-slate-400">
                {capacityForecasts.slice(0, 8).map((f) => (
                  <li key={String(f.id)} className="truncate">
                    {String(f.metric_name)}
                    {f.breach_eta ? ` · breach ${String(f.breach_eta).slice(0, 16)}` : ''}
                    {' · '}
                    {String(f.model_version ?? '')}
                  </li>
                ))}
                {capacityForecasts.length === 0 && <li>None yet — run Capacity 7d</li>}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <h2 className="text-sm font-medium text-slate-200 mb-2">Breach predictions</h2>
              <ul className="space-y-1 max-h-32 overflow-y-auto text-xs text-slate-400">
                {predictions.slice(0, 8).map((p) => (
                  <li key={String(p.id)} className="truncate">
                    {String(p.incident_type)} · {String(p.probability_pct)}%
                  </li>
                ))}
                {predictions.length === 0 && <li>None active</li>}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <h2 className="text-sm font-medium text-slate-200 mb-2">Remediation</h2>
              <ul className="space-y-2 max-h-48 overflow-y-auto text-xs text-slate-400">
                {approvals.slice(0, 10).map((a) => (
                  <li key={String(a.id)} className="rounded border border-slate-800 p-2 space-y-1">
                    <div className="truncate text-slate-300">
                      {String(a.status)} · {String(a.executionMode ?? a.execution_mode ?? '')} ·{' '}
                      {String(a.riskTier ?? a.risk_tier ?? '')}
                    </div>
                    <div className="truncate">{String(a.action)}</div>
                    <div className="flex flex-wrap gap-1">
                      {String(a.status) === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => void approveRemediation(String(a.id))}
                            className="rounded bg-emerald-800/80 px-1.5 py-0.5 text-[10px] text-white"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => void rejectRemediation(String(a.id))}
                            className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-white"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {(String(a.status) === 'approved' ||
                        (String(a.status) === 'pending' && a.requiresApproval === false)) && (
                        <button
                          type="button"
                          onClick={() => void executeRemediation(String(a.id))}
                          className="rounded bg-sky-800/80 px-1.5 py-0.5 text-[10px] text-white"
                        >
                          Execute
                        </button>
                      )}
                    </div>
                  </li>
                ))}
                {approvals.length === 0 && <li>None pending</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
