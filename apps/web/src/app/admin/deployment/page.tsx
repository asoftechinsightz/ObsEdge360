'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function DeploymentCenterPage() {
  const [profiles, setProfiles] = useState<Record<string, unknown> | null>(null);
  const [packages, setPackages] = useState<unknown[]>([]);
  const [msg, setMsg] = useState('');
  const load = async () => {
    const [p, a] = await Promise.all([
      apiClient<Record<string, unknown>>('/admin/deployment/profiles'),
      apiClient<{ packages: unknown[] }>('/admin/deployment/airgap'),
    ]);
    setProfiles(p);
    setPackages(a.packages);
  };
  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  async function registerProfile() {
    try {
      await apiClient('/admin/deployment/profiles', {
        method: 'POST',
        body: JSON.stringify({
          profileName: 'production',
          mode: 'onprem',
          namespace: 'opsedge360',
          helmRelease: 'opsedge360',
          airgap: false,
          valuesSnapshot: { chart: 'values-production.yaml' },
        }),
      });
      setMsg('Deployment profile registered');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function registerAirgap() {
    try {
      const checksum = 'a'.repeat(64);
      const pkg = await apiClient<{ id: string }>('/admin/deployment/airgap', {
        method: 'POST',
        body: JSON.stringify({
          packageName: 'opsedge360-airgap',
          version: 'v1.0.0-wave6',
          checksumSha256: checksum,
          manifest: { requiresInternet: false, offlineDocs: true },
          imageDigests: [],
        }),
      });
      await apiClient(`/admin/deployment/airgap/${pkg.id}/verify`, {
        method: 'POST',
        body: JSON.stringify({ computedChecksumSha256: checksum }),
      });
      setMsg('Air-gap package registered & verified');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="Deployment Center">
      <p className="mb-3 text-sm text-slate-400">Kubernetes production profiles · air-gap packages · Helm values-production</p>
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={registerProfile}>
          Register production profile
        </button>
        <button type="button" className="rounded-md border border-slate-600 px-4 py-2 text-sm" onClick={registerAirgap}>
          Register & verify air-gap package
        </button>
      </div>
      <pre className="mb-4 overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(profiles, null, 2)}
      </pre>
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(packages, null, 2)}
      </pre>
    </AdminShell>
  );
}
