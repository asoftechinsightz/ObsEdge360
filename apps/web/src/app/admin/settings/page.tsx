'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from './AdminShell';

export default function AdminSettingsPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [msg, setMsg] = useState('');

  const load = () => apiClient<Record<string, unknown>>('/admin/settings').then(setData);

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  async function savePlatform() {
    try {
      await apiClient('/admin/settings/platform', {
        method: 'PUT',
        body: JSON.stringify({
          telemetryRetentionDays: 30,
          discoveryScheduleCron: '0 */6 * * *',
          cmdbRetentionDays: 365,
          auditRetentionDays: 365,
        }),
      });
      setMsg('Platform settings saved');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="Platform Settings">
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <button type="button" className="mb-4 rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={savePlatform}>
        Save default platform retention
      </button>
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </AdminShell>
  );
}
