'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function PolicyManagerPage() {
  const [policies, setPolicies] = useState<Array<Record<string, unknown>>>([]);
  const [name, setName] = useState('Approval-required policy');
  const [controlMode, setControlMode] = useState('approval_required');
  const [msg, setMsg] = useState('');

  const load = () =>
    apiClient<{ policies: Array<Record<string, unknown>> }>('/automation/policies').then((d) =>
      setPolicies(d.policies),
    );

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  async function create() {
    try {
      await apiClient('/automation/policies', {
        method: 'POST',
        body: JSON.stringify({
          name,
          controlMode,
          executionMode: controlMode === 'auto_execute' ? 'dry_run' : 'dry_run',
          requireApproval: controlMode !== 'auto_execute' && controlMode !== 'read_only',
          maxApprovalLevels: 1,
        }),
      });
      setMsg('Policy created');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="Policy Manager">
      <p className="mb-3 text-sm text-slate-400">
        Modes: manual_only · approval_required · maintenance_window · auto_execute (simulation/dry_run only) ·
        read_only. Production always requires approval.
      </p>
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="min-w-[200px] flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          value={controlMode}
          onChange={(e) => setControlMode(e.target.value)}
        >
          <option value="manual_only">manual_only</option>
          <option value="approval_required">approval_required</option>
          <option value="maintenance_window">maintenance_window</option>
          <option value="auto_execute">auto_execute</option>
          <option value="read_only">read_only</option>
        </select>
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={create}>
          Create policy
        </button>
      </div>
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(policies, null, 2)}
      </pre>
    </AdminShell>
  );
}
