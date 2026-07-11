'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function EmergencyStopConsolePage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [msg, setMsg] = useState('');

  const load = () =>
    apiClient<Record<string, unknown>>('/automation/emergency-stop').then(setData);

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  async function setStop(emergencyStop: boolean) {
    try {
      await apiClient('/automation/emergency-stop', {
        method: 'POST',
        body: JSON.stringify({
          emergencyStop,
          reason: emergencyStop ? 'Operator emergency stop' : 'Cleared by operator',
        }),
      });
      setMsg(emergencyStop ? 'Emergency stop ENABLED — new executions blocked' : 'Emergency stop cleared');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function pause() {
    try {
      await apiClient('/automation/emergency-stop/pause', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Operator pause' }),
      });
      setMsg('All workflows paused');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function resume() {
    try {
      await apiClient('/automation/emergency-stop/resume', { method: 'POST', body: '{}' });
      setMsg('Workflows resumed');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function cancelQueued() {
    try {
      const r = await apiClient<{ cancelled: number }>('/automation/emergency-stop/cancel-queued', {
        method: 'POST',
        body: '{}',
      });
      setMsg(`Cancelled ${r.cancelled} queued/paused/awaiting`);
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="Emergency Stop Console">
      <p className="mb-3 text-sm text-slate-400">
        Global controls immediately prevent new workflow execution when emergency stop is active.
      </p>
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="rounded-md bg-red-700 px-4 py-2 text-sm text-white" onClick={() => setStop(true)}>
          Emergency Stop
        </button>
        <button type="button" className="rounded-md border border-slate-600 px-4 py-2 text-sm" onClick={() => setStop(false)}>
          Clear E-Stop
        </button>
        <button type="button" className="rounded-md border border-slate-600 px-4 py-2 text-sm" onClick={pause}>
          Pause all
        </button>
        <button type="button" className="rounded-md border border-slate-600 px-4 py-2 text-sm" onClick={resume}>
          Resume
        </button>
        <button type="button" className="rounded-md border border-slate-600 px-4 py-2 text-sm" onClick={cancelQueued}>
          Cancel queued
        </button>
      </div>
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </AdminShell>
  );
}
