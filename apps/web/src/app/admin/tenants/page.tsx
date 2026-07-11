'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from './AdminShell';

export default function AdminTenantsPage() {
  const [org, setOrg] = useState<{
    tenant: { name: string; slug: string; region: string };
    users: Array<{ id: string; email: string; name?: string; role: string }>;
    quota: Record<string, unknown> | null;
  } | null>(null);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');

  const load = () =>
    apiClient<typeof org extends infer T ? NonNullable<T> : never>('/admin/organization').then((d) => {
      setOrg(d);
      setName(d.tenant.name);
    });

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  async function save() {
    try {
      await apiClient('/admin/organization', { method: 'PUT', body: JSON.stringify({ name }) });
      setMsg('Organization updated');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="Tenant Management" subtitle="Organization profile and users (tenant-scoped)">
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      {org && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-700 bg-surface-elevated p-5">
            <div className="mb-3 text-sm text-slate-400">slug: {org.tenant.slug}</div>
            <label className="block text-xs text-slate-400">Organization name</label>
            <div className="mt-1 flex gap-2">
              <input
                className="flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={save}>
                Save
              </button>
            </div>
            <div className="mt-3 text-xs text-slate-500">region: {org.tenant.region}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-surface-elevated">
            <div className="border-b border-slate-700 px-5 py-3 font-medium">Users</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400">
                  <th className="px-5 py-2">Email</th>
                  <th className="px-5 py-2">Name</th>
                  <th className="px-5 py-2">Role</th>
                </tr>
              </thead>
              <tbody>
                {org.users.map((u) => (
                  <tr key={u.id} className="border-t border-slate-800">
                    <td className="px-5 py-2">{u.email}</td>
                    <td className="px-5 py-2">{u.name ?? '—'}</td>
                    <td className="px-5 py-2">{u.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
