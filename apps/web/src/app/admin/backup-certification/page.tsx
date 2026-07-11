'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function BackupCertificationPage() {
  const [schedules, setSchedules] = useState<unknown[]>([]);
  const [certs, setCerts] = useState<unknown[]>([]);
  const [msg, setMsg] = useState('');
  const load = async () => {
    const [s, c] = await Promise.all([
      apiClient<{ schedules: unknown[] }>('/admin/deployment/backup/schedules'),
      apiClient<{ certifications: unknown[] }>('/admin/deployment/backup/certifications'),
    ]);
    setSchedules(s.schedules);
    setCerts(c.certifications);
  };
  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  async function createSchedule() {
    try {
      await apiClient('/admin/deployment/backup/schedules', {
        method: 'POST',
        body: JSON.stringify({ name: 'Nightly PostgreSQL', target: 'postgresql', cronExpr: '0 2 * * *', retentionDays: 14, encrypt: true }),
      });
      setMsg('Schedule created');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function certify() {
    try {
      const checksum = 'b'.repeat(64);
      await apiClient('/admin/deployment/backup/certify', {
        method: 'POST',
        body: JSON.stringify({
          artifactPath: '/var/backups/opsedge360-demo.sql.gz',
          checksumSha256: checksum,
          sizeBytes: 1024,
          report: { integrity: 'checksum_validated' },
        }),
      });
      setMsg('Backup certified');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="Backup Certification">
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <div className="mb-4 flex gap-2">
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={createSchedule}>
          Create schedule
        </button>
        <button type="button" className="rounded-md border border-slate-600 px-4 py-2 text-sm" onClick={certify}>
          Certify artifact
        </button>
      </div>
      <pre className="mb-4 overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">{JSON.stringify(schedules, null, 2)}</pre>
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">{JSON.stringify(certs, null, 2)}</pre>
    </AdminShell>
  );
}
