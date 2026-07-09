import { DashboardShell } from '@/components/DashboardShell';
import { fetchApi } from '@/lib/api';

interface HaDrStatus {
  overallStatus: string;
  rtoTargetMinutes: number;
  rpoTargetMinutes: number;
  maxReplicationLagMs: number;
  regions: Array<{ regionCode: string; regionName: string; role: string; rtoMinutes: number; rpoMinutes: number; dataResidency?: string }>;
  statuses: Array<{ regionCode: string; healthStatus: string; replicationLagMs: number; failoverTestResult?: string; lastFailoverTest?: string }>;
}

interface FedrampScore {
  overallScore: number;
  baseline: string;
  controlsTotal: number;
  controlsImplemented: number;
  controlsPartial: number;
  controlsPlanned: number;
  readinessLevel: string;
}

interface FedrampControl {
  controlId: string;
  controlFamily: string;
  title: string;
  assessmentStatus: string;
  assessmentScore?: number;
}

export default async function GovernancePage() {
  let haDr: HaDrStatus = { overallStatus: 'healthy', rtoTargetMinutes: 30, rpoTargetMinutes: 5, maxReplicationLagMs: 0, regions: [], statuses: [] };
  let fedramp: FedrampScore = { overallScore: 0, baseline: 'moderate', controlsTotal: 0, controlsImplemented: 0, controlsPartial: 0, controlsPlanned: 0, readinessLevel: 'in_progress' };
  let controls: FedrampControl[] = [];

  try {
    const [h, f, c] = await Promise.all([
      fetchApi<HaDrStatus>('/governance/ha-dr/status'),
      fetchApi<FedrampScore>('/governance/fedramp/score'),
      fetchApi<{ controls: FedrampControl[] }>('/governance/fedramp/controls'),
    ]);
    haDr = h;
    fedramp = f;
    controls = c.controls;
  } catch {
    // fallback
  }

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Platform Governance</h1>
        <p className="text-sm text-slate-400">Global HA/DR, data residency, and FedRAMP-ready controls</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          { label: 'HA/DR Status', value: haDr.overallStatus, color: haDr.overallStatus === 'healthy' ? 'text-emerald-400' : 'text-amber-400' },
          { label: 'RTO Target', value: `${haDr.rtoTargetMinutes}m`, color: 'text-sky-400' },
          { label: 'FedRAMP Score', value: `${fedramp.overallScore}%`, color: 'text-violet-400' },
          { label: 'Replication Lag', value: `${haDr.maxReplicationLagMs}ms`, color: 'text-slate-300' },
        ].map((card) => (
          <div key={card.label} className="kpi-card">
            <div className="text-xs text-slate-400">{card.label}</div>
            <div className={`mt-2 text-3xl font-bold capitalize ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-surface-elevated">
          <div className="border-b border-slate-700 px-5 py-4">
            <h2 className="font-semibold">HA/DR Regions</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-xs text-slate-400">
                <th className="px-5 py-3">Region</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Health</th>
                <th className="px-5 py-3">Lag</th>
              </tr>
            </thead>
            <tbody>
              {haDr.statuses.map((s) => (
                <tr key={s.regionCode} className="border-b border-slate-700/50">
                  <td className="px-5 py-3">{s.regionCode}</td>
                  <td className="px-5 py-3 uppercase text-xs">{haDr.regions.find((r) => r.regionCode === s.regionCode)?.role ?? '—'}</td>
                  <td className="px-5 py-3 capitalize text-emerald-400">{s.healthStatus}</td>
                  <td className="px-5 py-3">{s.replicationLagMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-slate-700 bg-surface-elevated p-5">
          <h2 className="mb-3 font-semibold">FedRAMP Moderate Readiness</h2>
          <div className="mb-4 text-4xl font-bold text-violet-400">{fedramp.overallScore}%</div>
          <div className="space-y-2 text-sm text-slate-400">
            <div className="flex justify-between"><span>Implemented</span><span className="text-emerald-400">{fedramp.controlsImplemented}</span></div>
            <div className="flex justify-between"><span>Partial</span><span className="text-amber-400">{fedramp.controlsPartial}</span></div>
            <div className="flex justify-between"><span>Planned</span><span className="text-slate-500">{fedramp.controlsPlanned}</span></div>
            <div className="flex justify-between border-t border-slate-700 pt-2"><span>Readiness</span><span className="capitalize text-sky-400">{fedramp.readinessLevel.replace(/_/g, ' ')}</span></div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-surface-elevated">
        <div className="border-b border-slate-700 px-5 py-4">
          <h2 className="font-semibold">FedRAMP Controls</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-xs text-slate-400">
              <th className="px-5 py-3">Control</th>
              <th className="px-5 py-3">Title</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Score</th>
            </tr>
          </thead>
          <tbody>
            {controls.map((c) => (
              <tr key={c.controlId} className="border-b border-slate-700/50">
                <td className="px-5 py-3 font-mono text-xs">{c.controlId}</td>
                <td className="px-5 py-3">{c.title}</td>
                <td className="px-5 py-3 capitalize text-sky-400">{c.assessmentStatus}</td>
                <td className="px-5 py-3">{c.assessmentScore ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
