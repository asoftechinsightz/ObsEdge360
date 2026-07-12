'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/eig/primitives';
import { TrustBar } from '@/components/apex/TrustBar';
import { DemoAwareEmptyState } from '@/components/ede/DemoAwareEmptyState';
import { friendlyError } from '@/lib/friendly-error';

interface DriftEvent {
  id: string;
  ci_id: string;
  drift_type: string;
  severity: string;
  summary: string | null;
  detected_at: string;
  details?: {
    businessImpact?: string;
    recommendedAction?: string;
    approvalStatus?: string;
    label?: string;
  };
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
      setError(null);
      const [d, a] = await Promise.all([
        apiClient<{ events: DriftEvent[] }>('/cmdb/drift'),
        apiClient<{ assets: Asset[] }>('/cmdb/assets'),
      ]);
      setEvents(d.events ?? []);
      setAssets(a.assets ?? []);
    } catch (err) {
      setError(friendlyError(err, 'Drift signals are unavailable. Load Illustrative Demo Data to evaluate this module.'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function openHistory(ciId: string) {
    setSelectedCi(ciId);
    try {
      const res = await apiClient<{ history: Array<Record<string, unknown>> }>(
        `/cmdb/history?ciId=${encodeURIComponent(ciId)}`,
      );
      setHistory(res.history ?? []);
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <PageHeader
          title="CMDB Drift"
          purpose="Detect configuration changes against the trusted CMDB baseline — distinct from inventory itself."
          actions={
            <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded border border-white/20 px-3 py-2 text-sm">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          }
        />
        <TrustBar
          lastUpdated={new Date()}
          freshness="recent"
          dataSource="CMDB drift APIs"
          coverageLabel={`${events.length} open drift events`}
          integrationHealth={error ? 'degraded' : 'healthy'}
        />
        {error && <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-50">{error}</div>}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="eig-glass p-4">
            <h2 className="font-medium text-slate-100">Open drift</h2>
            <p className="mb-3 text-xs text-slate-500">Severity · detection time · business impact · recommended action · approval</p>
            {events.length === 0 ? (
              <DemoAwareEmptyState
                title="No open drift events"
                hint="CMDB Drift shows change detection — not the inventory list. Load demo data to see firewall, cert, K8s, and IAM examples."
                setupHref="/cmdb"
              />
            ) : (
              <ul className="mt-2 max-h-[32rem] space-y-3 overflow-auto text-sm">
                {events.map((e) => (
                  <li key={e.id} className="rounded border border-white/10 px-3 py-3">
                    <button type="button" className="w-full text-left" onClick={() => void openHistory(e.ci_id)}>
                      <div className="flex justify-between gap-2">
                        <span className="font-medium text-slate-100">{e.summary ?? e.drift_type}</span>
                        <span className="shrink-0 text-[10px] uppercase tracking-wide text-amber-300">{e.severity}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">Detected {new Date(e.detected_at).toLocaleString()}</div>
                      {e.details?.businessImpact && (
                        <div className="mt-2 text-xs text-slate-300">Impact: {e.details.businessImpact}</div>
                      )}
                      {e.details?.recommendedAction && (
                        <div className="mt-1 text-xs text-sky-200/90">Action: {e.details.recommendedAction}</div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-wide text-slate-500">
                        <span>{e.details?.label ?? 'Illustrative Demo Data'}</span>
                        {e.details?.approvalStatus && <span>Approval: {e.details.approvalStatus}</span>}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="eig-glass p-4">
            <h2 className="font-medium text-slate-100">CI context</h2>
            <p className="mb-3 text-xs text-slate-500">
              Inventory lives in <Link className="text-sky-400 hover:underline" href="/cmdb">CMDB</Link>. Drift is the change lens.
            </p>
            {selectedCi ? (
              <ul className="max-h-96 space-y-2 overflow-auto text-xs text-slate-400">
                {history.length === 0 && <li>No history rows for this CI yet.</li>}
                {history.map((h, i) => (
                  <li key={i} className="rounded border border-white/10 px-2 py-2">
                    {String(h.summary ?? h.change_type ?? h.version ?? `Revision ${i + 1}`)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Select a drift event to inspect related CI history.</p>
            )}
            <div className="mt-4 max-h-48 overflow-auto text-xs text-slate-500">
              <div className="mb-1 font-medium text-slate-400">Sample assets ({assets.length})</div>
              {assets.slice(0, 12).map((a) => (
                <div key={a.id}>
                  {a.name} · {a.ciType}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
