import { DashboardShell } from '@/components/DashboardShell';
import { fetchApi } from '@/lib/api';

interface Flow {
  id: string;
  src_ip: string;
  dst_ip: string;
  src_port: number;
  dst_port: number;
  protocol: string;
  bytes: string;
  latency_ms: string;
  packet_loss_pct: string;
  recorded_at: string;
}

export default async function NetworkPage() {
  let flows: Flow[] = [];
  let summary = { total_flows: 0, avg_latency: 0, total_bytes: 0 };

  try {
    const [flowData, sumData] = await Promise.all([
      fetchApi<{ flows: Flow[] }>('/network/flows'),
      fetchApi<typeof summary>('/network/summary'),
    ]);
    flows = flowData.flows;
    summary = sumData;
  } catch {
    flows = [];
  }

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Network Observability</h1>
        <p className="text-sm text-slate-400">NetFlow, IPFIX, SNMP — latency, jitter, packet loss, throughput</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
      </div>

      <div className="rounded-xl border border-slate-700 bg-surface-elevated">
        <div className="border-b border-slate-700 px-5 py-4">
          <h2 className="font-semibold">Recent Network Flows</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-xs text-slate-400">
              <th className="px-5 py-3">Source</th>
              <th className="px-5 py-3">Destination</th>
              <th className="px-5 py-3">Protocol</th>
              <th className="px-5 py-3">Latency</th>
              <th className="px-5 py-3">Loss</th>
              <th className="px-5 py-3">Bytes</th>
            </tr>
          </thead>
          <tbody>
            {flows.map((f) => (
              <tr key={f.id} className="border-b border-slate-700/50">
                <td className="px-5 py-3 font-mono text-xs">{f.src_ip}:{f.src_port}</td>
                <td className="px-5 py-3 font-mono text-xs">{f.dst_ip}:{f.dst_port}</td>
                <td className="px-5 py-3">{f.protocol}</td>
                <td className="px-5 py-3">{f.latency_ms}ms</td>
                <td className="px-5 py-3">{f.packet_loss_pct}%</td>
                <td className="px-5 py-3">{(Number(f.bytes) / 1024).toFixed(0)} KB</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
