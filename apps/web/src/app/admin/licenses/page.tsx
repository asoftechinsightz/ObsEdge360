'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function AdminLicensesPage() {
  const [licenses, setLicenses] = useState<Array<Record<string, unknown>>>([]);
  const [key, setKey] = useState('');
  const [msg, setMsg] = useState('');

  const load = () =>
    apiClient<{ licenses: Array<Record<string, unknown>> }>('/admin/licenses').then((d) => setLicenses(d.licenses));

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  async function create() {
    try {
      await apiClient('/admin/licenses', {
        method: 'POST',
        body: JSON.stringify({ licenseKey: key, licenseTier: 'enterprise', seats: 100 }),
      });
      setKey('');
      setMsg('License recorded (key stored as hash only)');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="License Management">
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <div className="mb-4 flex gap-2">
        <input
          className="flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          placeholder="License key (hashed at rest)"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={create}>
          Add license
        </button>
      </div>
      <div className="rounded-xl border border-slate-700 bg-surface-elevated">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400">
              <th className="px-5 py-2">Tier</th>
              <th className="px-5 py-2">Seats</th>
              <th className="px-5 py-2">Status</th>
              <th className="px-5 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {licenses.map((l) => (
              <tr key={String(l.id)} className="border-t border-slate-800">
                <td className="px-5 py-2">{String(l.license_tier)}</td>
                <td className="px-5 py-2">{String(l.seats ?? '—')}</td>
                <td className="px-5 py-2">{String(l.status)}</td>
                <td className="px-5 py-2">{String(l.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
