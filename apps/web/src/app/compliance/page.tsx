import { DashboardShell } from '@/components/DashboardShell';
import { fetchApi } from '@/lib/api';

interface Framework {
  code: string;
  name: string;
  version: string;
  score: number;
  controlsTotal: number;
  controlsPassed: number;
}

interface Control {
  controlId: string;
  framework: string;
  title: string;
  status: string;
  lastChecked?: string;
}

interface IndustryPack {
  code: string;
  name: string;
  industry: string;
  description?: string;
  frameworkCodes: string[];
  controlCount: number;
  enabled: boolean;
}

export default async function CompliancePage() {
  let frameworks: Framework[] = [];
  let controls: Control[] = [];
  let packs: IndustryPack[] = [];
  let overallScore = 0;

  try {
    const [fwData, ctrlData, scoreData, packData] = await Promise.all([
      fetchApi<{ frameworks: Framework[] }>('/compliance/frameworks'),
      fetchApi<{ controls: Control[] }>('/compliance/controls?framework=ISO27001'),
      fetchApi<{ overallScore: number }>('/compliance/score'),
      fetchApi<{ packs: IndustryPack[] }>('/compliance/packs'),
    ]);
    frameworks = fwData.frameworks;
    controls = ctrlData.controls;
    overallScore = scoreData.overallScore;
    packs = packData.packs;
  } catch {
    // fallback empty
  }

  const statusColor: Record<string, string> = {
    pass: 'text-emerald-400',
    fail: 'text-red-400',
    partial: 'text-amber-400',
    pending: 'text-slate-400',
  };

  return (
    <DashboardShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Compliance Dashboard</h1>
          <p className="text-sm text-slate-400">Continuous validation · auto-runs every 5 min · Overall: {overallScore}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {frameworks.map((fw) => (
          <div key={fw.code} className="kpi-card">
            <div className="text-xs text-slate-400">{fw.code}</div>
            <div className="mt-1 text-sm font-medium">{fw.name}</div>
            <div className="mt-3 text-3xl font-bold text-sky-400">{fw.score}%</div>
            <div className="mt-2 text-xs text-slate-500">
              {fw.controlsPassed}/{fw.controlsTotal} controls passed
            </div>
          </div>
        ))}
      </div>

      {packs.length > 0 && (
        <div className="mt-6 rounded-xl border border-slate-700 bg-surface-elevated">
          <div className="border-b border-slate-700 px-5 py-4">
            <h2 className="font-semibold">Regulated Industry Packs</h2>
            <p className="text-xs text-slate-400">BFSI, healthcare, and government framework bundles</p>
          </div>
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
            {packs.map((pack) => (
              <div key={pack.code} className={`rounded-lg border p-4 ${pack.enabled ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-700'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{pack.name}</span>
                  {pack.enabled && <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">Active</span>}
                </div>
                <p className="mt-1 text-xs capitalize text-slate-500">{pack.industry}</p>
                <p className="mt-2 text-sm text-slate-400">{pack.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {pack.frameworkCodes.map((fw) => (
                    <span key={fw} className="rounded bg-slate-700 px-2 py-0.5 text-xs">{fw}</span>
                  ))}
                </div>
                <div className="mt-2 text-xs text-slate-500">{pack.controlCount} pre-tuned controls</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-slate-700 bg-surface-elevated">
        <div className="border-b border-slate-700 px-5 py-4">
          <h2 className="font-semibold">ISO 27001 Controls</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-xs text-slate-400">
              <th className="px-5 py-3">Control</th>
              <th className="px-5 py-3">Title</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Last Checked</th>
            </tr>
          </thead>
          <tbody>
            {controls.map((c) => (
              <tr key={c.controlId} className="border-b border-slate-700/50">
                <td className="px-5 py-3 font-mono text-xs">{c.controlId}</td>
                <td className="px-5 py-3">{c.title}</td>
                <td className={`px-5 py-3 capitalize ${statusColor[c.status] ?? ''}`}>{c.status}</td>
                <td className="px-5 py-3 text-slate-400">
                  {c.lastChecked ? new Date(c.lastChecked).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
