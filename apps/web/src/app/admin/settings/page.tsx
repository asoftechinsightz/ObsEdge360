'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Array<Record<string, unknown>>>([]);
  const [minLen, setMinLen] = useState('8');
  const [msg, setMsg] = useState('');

  const load = () =>
    apiClient<{ settings: Array<Record<string, unknown>> }>('/admin/settings').then((d) => setSettings(d.settings));

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  async function savePasswordPolicy() {
    try {
      await apiClient('/admin/settings/password_policy', {
        method: 'PUT',
        body: JSON.stringify({ minLength: Number(minLen) || 8, requireComplexity: false }),
      });
      setMsg('Password policy setting saved');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="Platform Settings">
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <div className="mb-6 rounded-xl border border-slate-700 bg-surface-elevated p-5">
        <h2 className="mb-2 font-medium">Password policy</h2>
        <div className="flex gap-2">
          <input
            className="w-32 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
            value={minLen}
            onChange={(e) => setMinLen(e.target.value)}
          />
          <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={savePasswordPolicy}>
            Save
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Enforcement in auth login path expands in Wave 6; setting is persisted now.</p>
      </div>
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(settings, null, 2)}
      </pre>
    </AdminShell>
  );
}
