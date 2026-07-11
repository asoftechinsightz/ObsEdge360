'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function AdminIntegrationsPage() {
  const [connectors, setConnectors] = useState<Array<Record<string, unknown>>>([]);
  const [type, setType] = useState('webhook');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');

  const load = () =>
    apiClient<{ connectors: Array<Record<string, unknown>> }>('/admin/integrations').then((d) =>
      setConnectors(d.connectors),
    );

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  async function create() {
    try {
      await apiClient('/admin/integrations', {
        method: 'POST',
        body: JSON.stringify({ connectorType: type, name, config: { delivery: 'not_connected' } }),
      });
      setName('');
      setMsg('Connector registered as configured (not connected until Wave 5 delivery)');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="Integrations">
      <p className="mb-3 text-sm text-slate-400">
        Registry only in Wave 1. Status stays <code>configured</code> until health proves connectivity.
      </p>
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {['servicenow', 'jira', 'slack', 'teams', 'email', 'webhook', 'ldap', 'oidc', 'saml', 'aws', 'azure', 'gcp'].map(
            (t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ),
          )}
        </select>
        <input
          className="min-w-[200px] flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          placeholder="Display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={create}>
          Register
        </button>
      </div>
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(connectors, null, 2)}
      </pre>
    </AdminShell>
  );
}
