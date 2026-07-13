import { DashboardShell } from '@/components/DashboardShell';
import { fetchApi } from '@/lib/api';
import { AgentApprovalsPanel } from '@/components/agents/AgentApprovalsPanel';

export default async function AgentsPage() {
  let runs: Array<{ id: string; agentType: string; status: string; summary: string; confidence: number | null }> = [];
  let approvals: Array<{ id: string; action: string; riskTier: string; status: string }> = [];
  let backendAvailable = true;

  try {
    const [runsData, approvalsData] = await Promise.all([
      fetchApi<{ runs: typeof runs }>('/agents/runs'),
      fetchApi<{ approvals: typeof approvals }>('/agents/approvals'),
    ]);
    runs = runsData.runs ?? [];
    approvals = approvalsData.approvals ?? [];
  } catch {
    backendAvailable = false;
  }

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">AI Agents</h1>
        <p className="text-sm text-slate-400">Autonomous discovery, RCA, remediation, and compliance intelligence</p>
      </div>

      {!backendAvailable && (
        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Agent backend unavailable — approval controls are hidden until the service recovers.
        </p>
      )}

      {backendAvailable && <AgentApprovalsPanel initial={approvals} />}

      <div className="rounded-xl border border-slate-700 bg-surface-elevated">
        <div className="border-b border-slate-700 px-5 py-4">
          <h2 className="font-semibold">Recent Agent Runs</h2>
        </div>
        <div className="divide-y divide-slate-700">
          {runs.length === 0 && (
            <div className="p-5 text-sm text-slate-500">No agent runs recorded for this tenant.</div>
          )}
          {runs.map((run) => (
            <div key={run.id} className="flex items-start gap-4 p-5">
              <div
                className={`mt-1 h-2 w-2 rounded-full ${
                  run.status === 'running' ? 'animate-pulse bg-violet-400' : 'bg-emerald-400'
                }`}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-violet-500/20 px-2 py-0.5 text-xs capitalize text-violet-400">
                    {run.agentType}
                  </span>
                  <span className="text-xs text-slate-500">{run.status}</span>
                </div>
                <p className="mt-1 text-sm">{run.summary}</p>
                {run.confidence != null && (
                  <p className="mt-1 text-xs text-slate-400">Confidence: {run.confidence}%</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
