'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function RestoreCertificationPage() {
  const [certs, setCerts] = useState<unknown[]>([]);
  const [msg, setMsg] = useState('');
  const load = () =>
    apiClient<{ certifications: unknown[] }>('/admin/deployment/restore/certifications').then((d) => setCerts(d.certifications));
  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);
  async function attest() {
    try {
      await apiClient('/admin/deployment/restore/certify', {
        method: 'POST',
        body: JSON.stringify({
          restoreType: 'full',
          sourceArtifact: '/var/backups/opsedge360-demo.sql.gz',
          status: 'validated',
          validationReport: { checks: ['schema', 'rowcounts', 'app_health'], passed: true },
        }),
      });
      setMsg('Restore attestation recorded');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  return (
    <AdminShell title="Restore Certification">
      <p className="mb-3 text-sm text-slate-400">Host-side restore (scripts/restore-postgres.sh). This page records validation attestations only.</p>
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <button type="button" className="mb-4 rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={attest}>
        Attest restore validation
      </button>
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">{JSON.stringify(certs, null, 2)}</pre>
    </AdminShell>
  );
}
