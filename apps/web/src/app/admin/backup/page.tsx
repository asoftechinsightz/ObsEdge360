'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function AdminBackupPage() {
  const [runs, setRuns] = useState<Array<Record<string, unknown>>>([]);
  const [path, setPath] = useState('/var/backups/opsedge360');
  const [msg, setMsg] = useState('');

  const load = () =>
    apiClient<{ runs: Array<Record<string, unknown>> }>('/admin/backups').then((d) => setRuns(d.runs));

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  async function record() {
    try {
      await apiClient('/admin/backups', {
        method: 'POST',
        body: JSON.stringify({
          artifactPath: path,
          notes: 'Operator recorded backup; run scripts/backup-postgres.sh on host',
        }),
      });
      setMsg('Backup run recorded');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="Backup Manager">
      <p className="mb-3 text-sm text-slate-400">
        Execution uses host script <code>scripts/backup-postgres.sh</code>. This page records operator runs.
      </p>
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <div className="mb-4 flex gap-2">
        <input
          className="flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          value={path}
          onChange={(e) => setPath(e.target.value)}
        />
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={record}>
          Record backup
        </button>
      </div>
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(runs, null, 2)}
      </pre>
    </AdminShell>
  );
}
