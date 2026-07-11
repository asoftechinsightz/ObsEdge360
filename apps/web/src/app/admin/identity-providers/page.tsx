'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function IdentityProvidersPage() {
  const [providers, setProviders] = useState<Array<Record<string, unknown>>>([]);
  const [msg, setMsg] = useState('');
  const load = () =>
    apiClient<{ providers: Array<Record<string, unknown>> }>('/integrations/identity').then((d) => setProviders(d.providers));
  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);
  return (
    <AdminShell title="Identity Providers">
      <p className="mb-3 text-sm text-slate-400">LDAP · AD · SAML · OIDC — JIT provisioning; no local passwords when delegated.</p>
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">{JSON.stringify(providers, null, 2)}</pre>
    </AdminShell>
  );
}
