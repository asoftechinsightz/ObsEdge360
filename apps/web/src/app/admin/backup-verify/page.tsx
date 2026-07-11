'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function AdminBackupVerifyPage() {
  const [rows, setRows] = useState<unknown[]>([]);
  const [path, setPath] = useState('/var/backups/opsedge360/latest.sql.gz');
  const [msg, setMsg] = useState('');

  const load = () =>
    apiClient<{ verifications: unknown[] }>('/admin/backups/verifications').then((d) =>
      setRows(d.verifications),
    );

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  async function verify() {
    try {
      await apiClient('/admin/backups/verify', {
        method: 'POST',
        body: JSON.stringify({
          artifactPath: path,
          integrityOk: true,
          restoreVerified: false,
          report: { method: 'checksum_attestation' },
        }),
      });
      setMsg('Verification recorded');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="Backup Verification">
      <p className="mb-3 text-sm text-slate-400">
        Records integrity/restore attestation. Host restore remains <code>scripts/restore-postgres.sh</code>.
      </p>
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <div className="mb-4 flex gap-2">
        <input
          className="flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          value={path}
          onChange={(e) => setPath(e.target.value)}
        />
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={verify}>
          Verify
        </button>
      </div>
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(rows, null, 2)}
      </pre>
    </AdminShell>
  );
}
