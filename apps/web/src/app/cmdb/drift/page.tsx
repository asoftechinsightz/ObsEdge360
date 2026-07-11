'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';

interface DriftEvent {
  id: string;
  ci_id: string;
  drift_type: string;
  severity: string;
  summary: string | null;
  detected_at: string;
}

interface Asset {
  id: string;
  name: string;
  ciType: string;
  status: string;
}

export default function CmdbDriftPage() {
  const [events, setEvents] = useState<DriftEvent[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [selectedCi, setSelectedCi] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [d, a] = await Promise.all([
        apiClient<{ events: DriftEvent[] }>('/cmdb/drift'),
        apiClient<{ assets: Asset[] }>('/cmdb/assets'),
      ]);
      setEvents(d.events ?? []);
      setAssets(a.assets ?? []);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function openHistory(ciId: string) {
    setSelectedCi(ciId);
    const res = await apiClient<{ history: Array<Record<string, unknown>> }>(
      `/cmdb/history?ciId=${encodeURIComponent(ciId)}`,
    );
    setHistory(res.history ?? []);
  }

  return (
    <DashboardShell>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Configuration Drift</h1>
            <p className="text-sm text-slate-500">Open drift events and CI history</p>
          </div>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
        {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border bg-white p-4">
            <h2 className="font-medium">Open drift</h2>
            <ul className="mt-2 max-h-96 space-y-2 overflow-auto text-sm">
              {events.map((e) => (
                <li key={e.id} className="border-b py-2">
                  <button type="button" className="w-full text-left" onClick={() => void openHistory(e.ci_id)}>
                    <div className="flex justify-between">
                      <span>{e.summary ?? e.drift_type}</span>
                      <span className="text-xs uppercase text-amber-700">{e.severity}</span>
                    </div>
                    <div className="text-xs text-slate-400">{new Date(e.detected_at).toLocaleString()}</div>
                  </button>
                </li>
              ))}
              {!events.length && <li className="text-slate-400">No open drift</li>}
            </ul>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <h2 className="font-medium">Asset inventory</h2>
            <ul className="mt-2 max-h-96 space-y-1 overflow-auto text-sm">
              {assets.slice(0, 100).map((a) => (
                <li key={a.id}>
                  <button type="button" className="w-full text-left hover:bg-slate-50" onClick={() => void openHistory(a.id)}>
                    {a.name} <span className="text-slate-400">{a.ciType}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <h2 className="font-medium">History {selectedCi ? `(${selectedCi.slice(0, 8)}…)` : ''}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {history.map((h) => (
              <li key={String(h.id)} className="border-b py-1">
                v{String(h.version)} · {String(h.change_type)} · {String(h.created_at)}
              </li>
            ))}
            {!history.length && <li className="text-slate-400">Select an asset or drift event</li>}
          </ul>
        </div>
      </div>
    </DashboardShell>
  );
}
