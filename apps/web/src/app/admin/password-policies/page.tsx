'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function AdminPasswordPoliciesPage() {
  const [policy, setPolicy] = useState<unknown>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    apiClient<{ policies: Array<{ policy_type: string; config: unknown }> }>('/admin/security-policies')
      .then((d) => setPolicy(d.policies.find((p) => p.policy_type === 'password') ?? null))
      .catch((e: Error) => setErr(e.message));
  }, []);
  return (
    <AdminShell title="Password Policies">
      {err && <p className="text-sm text-red-400">{err}</p>}
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(policy, null, 2)}
      </pre>
    </AdminShell>
  );
}
