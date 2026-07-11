'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function AdminSecurityPoliciesPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [msg, setMsg] = useState('');

  const load = () =>
    apiClient<Record<string, unknown>>('/admin/security-policies').then(setData);

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  async function savePassword() {
    try {
      await apiClient('/admin/security-policies/password', {
        method: 'PUT',
        body: JSON.stringify({
          minLength: 10,
          requireComplexity: true,
          maxFailedAttempts: 5,
          lockoutMinutes: 15,
          historyCount: 3,
        }),
      });
      setMsg('Password policy updated');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function saveSession() {
    try {
      await apiClient('/admin/security-policies/session', {
        method: 'PUT',
        body: JSON.stringify({
          sessionTimeoutMinutes: 480,
          idleTimeoutMinutes: 30,
          maxConcurrentSessions: 5,
          deviceTracking: true,
          forcedLogoutEnabled: true,
        }),
      });
      setMsg('Session policy updated');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="Security Policies">
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <div className="mb-4 flex gap-2">
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={savePassword}>
          Apply strong password policy
        </button>
        <button type="button" className="rounded-md border border-slate-600 px-4 py-2 text-sm" onClick={saveSession}>
          Apply session policy
        </button>
      </div>
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </AdminShell>
  );
}
