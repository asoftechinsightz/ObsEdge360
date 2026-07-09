import { DashboardShell } from '@/components/DashboardShell';
import { fetchApi } from '@/lib/api';

interface Summary {
  activeJobs: number;
  completedJobs: number;
  pqcReadinessScore: number;
  tlsPqcReady: boolean;
  providers: string[];
}

interface QuantumJob {
  id: string;
  externalJobId?: string;
  provider: string;
  jobType: string;
  algorithm?: string;
  qubitsUsed?: number;
  status: string;
  resultSummary: Record<string, unknown>;
}

interface Readiness {
  score: number;
  assessmentType: string;
  pqcAlgorithmsAdopted?: string[];
  tlsPqcReady?: boolean;
  findings?: Array<{ area: string; status: string; detail: string }>;
  recommendations?: Array<{ priority: string; action: string }>;
}

export default async function QuantumPage() {
  let summary: Summary = { activeJobs: 0, completedJobs: 0, pqcReadinessScore: 0, tlsPqcReady: false, providers: [] };
  let jobs: QuantumJob[] = [];
  let readiness: Readiness = { score: 0, assessmentType: 'pqc_migration' };

  try {
    const [s, j, r] = await Promise.all([
      fetchApi<Summary>('/quantum/summary'),
      fetchApi<{ jobs: QuantumJob[] }>('/quantum/jobs'),
      fetchApi<Readiness>('/quantum/readiness'),
    ]);
    summary = s;
    jobs = j.jobs;
    readiness = r;
  } catch {
    // fallback
  }

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Quantum Readiness</h1>
        <p className="text-sm text-slate-400">Hybrid classical-quantum job monitoring and post-quantum cryptography migration</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          { label: 'PQC Readiness', value: `${summary.pqcReadinessScore || readiness.score}%`, color: 'text-violet-400' },
          { label: 'Active Jobs', value: summary.activeJobs, color: 'text-sky-400' },
          { label: 'Completed Jobs', value: summary.completedJobs, color: 'text-emerald-400' },
          { label: 'TLS PQC Ready', value: (summary.tlsPqcReady || readiness.tlsPqcReady) ? 'Yes' : 'No', color: 'text-amber-400' },
        ].map((card) => (
          <div key={card.label} className="kpi-card">
            <div className="text-xs text-slate-400">{card.label}</div>
            <div className={`mt-2 text-3xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {readiness.pqcAlgorithmsAdopted && readiness.pqcAlgorithmsAdopted.length > 0 && (
        <div className="mb-6 rounded-xl border border-violet-500/30 bg-violet-500/10 p-5">
          <h2 className="mb-2 font-semibold text-violet-400">Post-Quantum Algorithms</h2>
          <div className="flex flex-wrap gap-2">
            {readiness.pqcAlgorithmsAdopted.map((alg) => (
              <span key={alg} className="rounded bg-slate-700 px-3 py-1 text-sm">{alg}</span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-surface-elevated">
          <div className="border-b border-slate-700 px-5 py-4">
            <h2 className="font-semibold">Quantum Jobs</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-xs text-slate-400">
                <th className="px-5 py-3">Provider</th>
                <th className="px-5 py-3">Algorithm</th>
                <th className="px-5 py-3">Qubits</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-b border-slate-700/50">
                  <td className="px-5 py-3 capitalize">{j.provider.replace(/_/g, ' ')}</td>
                  <td className="px-5 py-3">{j.algorithm ?? j.jobType}</td>
                  <td className="px-5 py-3">{j.qubitsUsed ?? '—'}</td>
                  <td className="px-5 py-3 capitalize text-sky-400">{j.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-slate-700 bg-surface-elevated p-5">
          <h2 className="mb-3 font-semibold">PQC Migration Recommendations</h2>
          {(readiness.recommendations ?? []).map((rec, i) => (
            <div key={i} className="mb-2 rounded-lg bg-surface p-3 text-sm">
              <span className="mr-2 rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400 uppercase">{rec.priority}</span>
              {rec.action}
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
