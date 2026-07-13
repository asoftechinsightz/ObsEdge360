'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { PageHeader, StatusBadge } from '@/components/eig/primitives';
import { TrustBar } from '@/components/apex/TrustBar';
import { DemoAwareEmptyState } from '@/components/ede/DemoAwareEmptyState';

type Flow = {
  id: string;
  src_ip?: string;
  dst_ip?: string;
  src_port?: number;
  dst_port?: number;
  protocol?: string;
  bytes?: string | number;
  latency_ms?: string | number;
  packet_loss_pct?: string | number;
  recorded_at?: string;
  src_ci_id?: string;
  dst_ci_id?: string;
};

type Summary = { total_flows: number; avg_latency: number; total_bytes: number };

export default function NetworkPage() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [summary, setSummary] = useState<Summary>({ total_flows: 0, avg_latency: 0, total_bytes: 0 });
  const [err, setErr] = useState('');
  const [selected, setSelected] = useState<Flow | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient<{ flows: Flow[] }>('/network/flows'),
      apiClient<Summary>('/network/summary'),
    ])
      .then(([f, s]) => {
        setFlows(f.flows ?? []);
        setSummary(s);
      })
      .catch((e: Error) => setErr(e.message));
  }, []);

  const degraded = useMemo(
    () =>
      flows.filter((f) => Number(f.packet_loss_pct) >= 1 || Number(f.latency_ms) >= 80),
    [flows],
  );

  const impactHref = (f: Flow) => {
    const q = new URLSearchParams({
      workflow: 'create-incident',
      source: 'network',
      loss: String(f.packet_loss_pct ?? ''),
      latency: String(f.latency_ms ?? ''),
      src: String(f.src_ip ?? ''),
      dst: String(f.dst_ip ?? ''),
    });
    return `/ops-intelligence?${q.toString()}`;
  };

  return (
    <DashboardShell>
      <PageHeader
        title="Network Operations"
        purpose="Packet loss, latency, bandwidth, and dependency impact — degrade → investigate → remediate."
        actions={
          <Link
            href="/ops-intelligence?workflow=create-incident&source=network"
            className="rounded bg-sky-700 px-3 py-2 text-xs text-white"
          >
            Open network incident
          </Link>
        }
      />
      <TrustBar
        lastUpdated={new Date()}
        freshness={flows.length ? 'live' : 'unknown'}
        dataSource="Network flows · topology · twin"
        coverageLabel={`${summary.total_flows} flows · ${degraded.length} degraded`}
        integrationHealth={err ? 'degraded' : 'healthy'}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="kpi-card">
          <div className="text-xs text-slate-400">Flows (1h)</div>
          <div className="mt-2 text-2xl font-bold text-sky-400">{summary.total_flows}</div>
        </div>
        <div className="kpi-card">
          <div className="text-xs text-slate-400">Avg Latency</div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">{Number(summary.avg_latency).toFixed(2)}ms</div>
        </div>
        <div className="kpi-card">
          <div className="text-xs text-slate-400">Throughput</div>
          <div className="mt-2 text-2xl font-bold text-violet-400">
            {(Number(summary.total_bytes) / 1024 / 1024).toFixed(1)} MB
          </div>
        </div>
        <div className="kpi-card">
          <div className="text-xs text-slate-400">Degraded paths</div>
          <div className="mt-2 text-2xl font-bold text-amber-400">{degraded.length}</div>
        </div>
      </div>

      {err && <p className="mb-3 text-sm text-amber-300">{err}</p>}

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-xl border border-slate-700 bg-surface-elevated">
          <div className="border-b border-slate-700 px-5 py-4">
            <h2 className="font-semibold">Network flows</h2>
          </div>
          {!flows.length ? (
            <div className="p-4">
              <DemoAwareEmptyState
                title="No network flows"
                hint="Load Illustrative Demo Data or connect NetFlow/IPFIX collectors."
                setupHref="/demo/guided"
              />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-xs text-slate-400">
                  <th className="px-5 py-3">Source</th>
                  <th className="px-5 py-3">Destination</th>
                  <th className="px-5 py-3">Protocol</th>
                  <th className="px-5 py-3">Latency</th>
                  <th className="px-5 py-3">Loss</th>
                  <th className="px-5 py-3">Health</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {flows.map((f) => {
                  const loss = Number(f.packet_loss_pct);
                  const lat = Number(f.latency_ms);
                  const bad = loss >= 1 || lat >= 80;
                  return (
                    <tr
                      key={f.id}
                      className="border-b border-slate-700/50 hover:bg-white/[0.02]"
                      onClick={() => setSelected(f)}
                    >
                      <td className="px-5 py-3 font-mono text-xs">
                        {f.src_ip}:{f.src_port}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">
                        {f.dst_ip}:{f.dst_port}
                      </td>
                      <td className="px-5 py-3">{f.protocol}</td>
                      <td className="px-5 py-3">{f.latency_ms}ms</td>
                      <td className="px-5 py-3">{f.packet_loss_pct}%</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={bad ? 'critical' : 'healthy'} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-2 text-[11px]">
                          <Link className="text-sky-400 hover:underline" href="/topology?type=network">
                            Topology
                          </Link>
                          <Link className="text-sky-400 hover:underline" href="/twin?workflow=impact">
                            Twin
                          </Link>
                          <Link className="text-sky-400 hover:underline" href={impactHref(f)}>
                            Incident
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-slate-700 bg-surface-elevated p-4">
            <h3 className="mb-2 text-sm font-semibold">Selected path impact</h3>
            {!selected ? (
              <p className="text-xs text-slate-500">Select a flow to inspect impact and next actions.</p>
            ) : (
              <div className="space-y-2 text-xs text-slate-300">
                <div>
                  {selected.src_ip} → {selected.dst_ip} ({selected.protocol})
                </div>
                <div>Latency {selected.latency_ms}ms · Loss {selected.packet_loss_pct}%</div>
                <div>Bandwidth {(Number(selected.bytes) / 1024).toFixed(0)} KB observed</div>
                <div className="flex flex-col gap-1 pt-2">
                  <Link className="text-sky-400 hover:underline" href="/topology?type=network">
                    Open network topology →
                  </Link>
                  <Link className="text-sky-400 hover:underline" href="/twin?workflow=impact">
                    Digital Twin blast radius →
                  </Link>
                  <Link className="text-sky-400 hover:underline" href={impactHref(selected)}>
                    Create / open incident →
                  </Link>
                  <Link
                    className="text-sky-400 hover:underline"
                    href="/admin/workflows?workflow=run"
                  >
                    Run remediation automation →
                  </Link>
                  <Link
                    className="text-sky-400 hover:underline"
                    href="/ops-intelligence?workflow=create-incident&source=network-verify"
                  >
                    Verify recovery path →
                  </Link>
                </div>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-100">
            <div className="font-semibold">Network degradation scenario</div>
            <p className="mt-1 text-amber-200/80">
              Packet loss / latency → affected path → topology → twin dependencies → incident → automation →
              verification.
            </p>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
