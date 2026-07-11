'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function AdminPasswordPoliciesPage() {
  const [pwd, setPwd] = useState({
    minLength: 12,
    requireComplexity: true,
    maxFailedAttempts: 5,
    lockoutMinutes: 15,
    expiryDays: 90,
    historyCount: 5,
    reusePrevention: true,
    adminOverride: true,
  });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = () =>
    apiClient<{ policies: Array<{ policy_type: string; config: Record<string, unknown> }> }>('/admin/security-policies')
      .then((d) => {
        const p = d.policies.find((x) => x.policy_type === 'password')?.config;
        if (p) setPwd((prev) => ({ ...prev, ...p } as typeof prev));
      });

  useEffect(() => {
    load().catch((e: Error) => setErr(e.message));
  }, []);

  async function save() {
    try {
      await apiClient('/admin/system/security/password', { method: 'PUT', body: JSON.stringify(pwd) });
      setMsg('Password policy saved');
      setErr('');
      await load();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <AdminShell title="Password Policies">
      <p className="mb-3 text-sm text-slate-400">
        Wave 3 store · Wave 6 write path via System Security API. Also editable under /admin/system/security.
      </p>
      {err && <p className="mb-2 text-sm text-red-400">{err}</p>}
      {msg && <p className="mb-2 text-sm text-slate-300">{msg}</p>}
      <div className="mb-4 space-y-3 text-sm">
        {Object.entries(pwd).map(([k, v]) => (
          <label key={k} className="flex items-center justify-between gap-4">
            <span className="text-slate-400">{k}</span>
            {typeof v === 'boolean' ? (
              <input type="checkbox" checked={!!v} onChange={(e) => setPwd({ ...pwd, [k]: e.target.checked })} />
            ) : (
              <input
                className="w-40 rounded-md border border-slate-600 bg-slate-950 px-2 py-1"
                value={String(v)}
                onChange={(e) =>
                  setPwd({ ...pwd, [k]: Number.isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value) })
                }
              />
            )}
          </label>
        ))}
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-white" onClick={save}>
          Save password policy
        </button>
      </div>
    </AdminShell>
  );
}
