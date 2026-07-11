'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Play, Plus, Radar } from 'lucide-react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';

interface ProviderInfo {
  protocols: string[];
  providers: Array<{ name: string; protocol: string }>;
}

interface Job {
  id: string;
  name: string;
  job_type: string;
  enabled: boolean;
  connector_ids: string[];
}

interface Run {
  id: string;
  status: string;
  assets_discovered: number;
  connector_id: string | null;
  created_at: string;
  error_message?: string | null;
}

interface Connector {
  id: string;
  name: string;
  protocol: string;
}

export default function DiscoveryOpsPage() {
  const [providers, setProviders] = useState<ProviderInfo | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [results, setResults] = useState<Array<Record<string, unknown>>>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, j, r, c] = await Promise.all([
        apiClient<ProviderInfo>('/discovery/providers'),
        apiClient<{ jobs: Job[] }>('/discovery/jobs'),
        apiClient<{ runs: Run[] }>('/discovery/runs'),
        apiClient<{ connectors: Connector[] }>('/discovery/connectors'),
      ]);
      setProviders(p);
      setJobs(j.jobs ?? []);
      setRuns(r.runs ?? []);
      setConnectors(c.connectors ?? []);
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createJob() {
    if (!connectors[0]) {
      setMessage('Create a connector first');
      return;
    }
    await apiClient('/discovery/jobs', {
      method: 'POST',
      body: JSON.stringify({
        name: `Job ${new Date().toISOString()}`,
        jobType: 'on_demand',
        connectorIds: [connectors[0].id],
        parallelWorkers: 2,
      }),
    });
    await load();
  }

  async function runJob(id: string) {
    setMessage('Running job…');
    await apiClient(`/discovery/jobs/${id}/run`, { method: 'POST', body: '{}' });
    setMessage('Job completed');
    await load();
  }

  async function runConnector(id: string) {
    setMessage('Running connector…');
    const res = await apiClient<{ runId?: string; scanId?: string; assetsDiscovered?: number }>(
      '/discovery/run',
      { method: 'POST', body: JSON.stringify({ connectorId: id }) },
    );
    setMessage(`Discovered ${res.assetsDiscovered ?? 0} assets`);
    await load();
  }

  async function loadResults(runId: string) {
    setSelectedRun(runId);
    const res = await apiClient<{ results: Array<Record<string, unknown>> }>(
      `/discovery/results?runId=${encodeURIComponent(runId)}`,
    );
    setResults(res.results ?? []);
  }

  return (
    <DashboardShell>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Discovery Operations</h1>
            <p className="text-sm text-slate-500">Jobs, runs, providers, and results</p>
          </div>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
        {message && <div className="rounded border bg-slate-50 p-3 text-sm">{message}</div>}
        {loading && <div className="text-slate-400">Loading…</div>}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border bg-white p-4">
            <h2 className="font-medium flex items-center gap-2"><Radar className="h-4 w-4" /> Providers</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {(providers?.protocols ?? []).map((p) => (
                <span key={p} className="rounded-full bg-slate-100 px-2 py-1">{p}</span>
              ))}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Jobs</h2>
              <button type="button" onClick={() => void createJob()} className="inline-flex items-center gap-1 text-sm">
                <Plus className="h-4 w-4" /> New job
              </button>
            </div>
            <ul className="mt-2 space-y-2 text-sm">
              {jobs.map((j) => (
                <li key={j.id} className="flex items-center justify-between border-b py-2">
                  <span>{j.name} <span className="text-slate-400">({j.job_type})</span></span>
                  <button type="button" onClick={() => void runJob(j.id)} className="inline-flex items-center gap-1 rounded border px-2 py-1">
                    <Play className="h-3 w-3" /> Run
                  </button>
                </li>
              ))}
              {!jobs.length && <li className="text-slate-400">No jobs yet</li>}
            </ul>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <h2 className="font-medium">Connectors (on-demand run)</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {connectors.map((c) => (
              <li key={c.id} className="flex items-center justify-between border-b py-2">
                <span>{c.name} <span className="text-slate-400">{c.protocol}</span></span>
                <button type="button" onClick={() => void runConnector(c.id)} className="rounded border px-2 py-1">
                  Discover
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border bg-white p-4">
            <h2 className="font-medium">Recent runs</h2>
            <ul className="mt-2 max-h-80 space-y-2 overflow-auto text-sm">
              {runs.map((r) => (
                <li key={r.id}>
                  <button type="button" className="w-full text-left hover:bg-slate-50" onClick={() => void loadResults(r.id)}>
                    <div className="flex justify-between">
                      <span>{r.status}</span>
                      <span>{r.assets_discovered} assets</span>
                    </div>
                    <div className="text-xs text-slate-400">{new Date(r.created_at).toLocaleString()}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <h2 className="font-medium">Results {selectedRun ? `(${selectedRun.slice(0, 8)}…)` : ''}</h2>
            <ul className="mt-2 max-h-80 space-y-1 overflow-auto text-sm">
              {results.map((r) => (
                <li key={String(r.id)} className="border-b py-1">
                  {String(r.name)} <span className="text-slate-400">{String(r.ci_type)}</span>
                </li>
              ))}
              {!results.length && <li className="text-slate-400">Select a run</li>}
            </ul>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
