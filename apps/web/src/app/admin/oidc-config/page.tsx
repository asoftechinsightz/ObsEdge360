'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function OidcConfigPage() {
  const [name, setName] = useState('Enterprise OIDC');
  const [url, setUrl] = useState('');
  const [msg, setMsg] = useState('');
  async function save() {
    try {
      await apiClient('/integrations/identity', {
        method: 'POST',
        body: JSON.stringify({
          name,
          protocol: 'oidc',
          config: { issuer: url, clientId: '' },
          jitProvisioning: true,
        }),
      });
      setMsg('Saved — client secrets via secretRef / existing SSO admin');
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  return (
    <AdminShell title="OIDC Configuration">
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <div className="mb-4 flex flex-wrap gap-2">
        <input className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="min-w-[220px] flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm" placeholder="Issuer URL" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={save}>Save</button>
      </div>
    </AdminShell>
  );
}
