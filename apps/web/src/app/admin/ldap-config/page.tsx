'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

function IdentityProtocolForm({ protocol, title }: { protocol: 'ldap' | 'active_directory' | 'saml' | 'oidc'; title: string }) {
  const [name, setName] = useState(`${title} provider`);
  const [host, setHost] = useState('');
  const [msg, setMsg] = useState('');

  async function save() {
    try {
      const config: Record<string, unknown> =
        protocol === 'ldap' || protocol === 'active_directory'
          ? { host, bindDn: '', baseDn: '', useTls: true, userDnTemplate: 'uid={username},ou=people' }
          : protocol === 'oidc'
            ? { issuer: host, clientId: '' }
            : { entryPoint: host, idpEntityId: '', idpCert: '' };
      const r = await apiClient('/integrations/identity', {
        method: 'POST',
        body: JSON.stringify({
          name,
          protocol,
          config,
          jitProvisioning: true,
          roleMapping: { default: 'operator' },
        }),
      });
      setMsg(`Saved ${String((r as { id?: string }).id || 'ok')} — bind passwords via secretRef only`);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title={title}>
      <p className="mb-3 text-sm text-slate-400">Configuration metadata only. Credentials must use Enterprise Secret Management references.</p>
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <div className="mb-4 flex flex-wrap gap-2">
        <input className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
        <input
          className="min-w-[220px] flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          placeholder={protocol === 'oidc' ? 'Issuer URL' : protocol === 'saml' ? 'IdP entry point' : 'LDAP host'}
          value={host}
          onChange={(e) => setHost(e.target.value)}
        />
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={save}>Save</button>
      </div>
    </AdminShell>
  );
}

export default function LdapConfigPage() {
  return <IdentityProtocolForm protocol="ldap" title="LDAP Configuration" />;
}
