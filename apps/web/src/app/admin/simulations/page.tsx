'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function SimulationResultsPage() {
  const [simulations, setSimulations] = useState<Array<Record<string, unknown>>>([]);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    apiClient<{ simulations: Array<Record<string, unknown>> }>('/automation/simulations')
      .then((d) => setSimulations(d.simulations))
      .catch((e: Error) => setMsg(e.message));
  }, []);
  return (
    <AdminShell title="Simulation Results">
      <p className="mb-3 text-sm text-slate-400">
        Step-by-step previews with predicted changes, dependency impact, duration, and rollback preview. No production
        mutations.
      </p>
      {msg && <p className="mb-3 text-sm text-red-400">{msg}</p>}
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(simulations, null, 2)}
      </pre>
    </AdminShell>
  );
}
