'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function AdminAutomationPage() {
  const [policies, setPolicies] = useState<Array<Record<string, unknown>>>([]);
  const [name, setName] = useState('Default remediation policy');
  const [msg, setMsg] = useState('');

  const load = () =>
    apiClient<{ policies: Array<Record<string, unknown>> }>('/admin/automation/policies').then((d) =>
      setPolicies(d.policies),
    );

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  async function create() {
    try {
      await apiClient('/admin/automation/policies', {
        method: 'POST',
        body: JSON.stringify({
          name,
          executionMode: 'dry_run',
          requireApproval: true,
          emergencyStop: false,
        }),
      });
      setMsg('Policy created (production mode always requires approval)');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function toggleStop(id: string, emergencyStop: boolean) {
    try {
      await apiClient(`/admin/automation/policies/${id}/emergency-stop`, {
        method: 'PATCH',
        body: JSON.stringify({ emergencyStop }),
      });
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="Automation Policies">
      <p className="mb-3 text-sm text-slate-400">
        No autonomous production execution without policy approval. Emergency stop freezes policy execution flags.
      </p>
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <div className="mb-4 flex gap-2">
        <input
          className="flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={create}>
          Create policy
        </button>
      </div>
      <div className="space-y-2">
        {policies.map((p) => (
          <div key={String(p.id)} className="flex items-center justify-between rounded-xl border border-slate-700 bg-surface-elevated px-4 py-3 text-sm">
            <div>
              <div className="font-medium">{String(p.name)}</div>
              <div className="text-xs text-slate-400">
                mode={String(p.execution_mode)} · approval={String(p.require_approval)} · e-stop=
                {String(p.emergency_stop)}
              </div>
            </div>
            <button
              type="button"
              className="rounded-md border border-slate-600 px-3 py-1 text-xs"
              onClick={() => toggleStop(String(p.id), !p.emergency_stop)}
            >
              {p.emergency_stop ? 'Clear E-Stop' : 'Emergency Stop'}
            </button>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
