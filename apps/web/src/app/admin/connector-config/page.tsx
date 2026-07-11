'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function ConnectorConfigPage() {
  const [connectors, setConnectors] = useState<Array<Record<string, unknown>>>([]);
  const [type, setType] = useState('webhook');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [msg, setMsg] = useState('');

  const load = () =>
    apiClient<{ connectors: Array<Record<string, unknown>> }>('/integrations/connectors').then((d) =>
      setConnectors(d.connectors),
    );

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  async function create() {
    try {
      const config: Record<string, unknown> = {};
      if (type === 'servicenow') config.instanceUrl = url;
      else if (type === 'jira') config.baseUrl = url;
      else if (['webhook', 'slack', 'teams'].includes(type)) config.webhookUrl = url;
      else if (type === 'email') config.apiUrl = url;
      else if (type === 'ldap' || type === 'active_directory') config.host = url;
      else if (type === 'oidc') config.issuer = url;
      else if (type === 'saml') config.entryPoint = url;
      await apiClient('/integrations/connectors', {
        method: 'POST',
        body: JSON.stringify({ connectorType: type, name, config }),
      });
      setMsg('Registered (credentials via secretRef only — never plaintext)');
      setName('');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function test(id: string) {
    try {
      const r = await apiClient(`/integrations/connectors/${id}/test`, { method: 'POST', body: '{}' });
      setMsg(`Test: ${JSON.stringify(r)}`);
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function toggle(id: string, enabled: boolean) {
    try {
      await apiClient(`/integrations/connectors/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !enabled }),
      });
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="Connector Configuration">
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <div className="mb-4 flex flex-wrap gap-2">
        <select className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
          {['servicenow', 'jira', 'slack', 'teams', 'email', 'webhook', 'ldap', 'active_directory', 'oidc', 'saml'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="min-w-[220px] flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm" placeholder="URL / host / issuer" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={create}>Register</button>
      </div>
      <div className="space-y-2">
        {connectors.map((c) => (
          <div key={String(c.id)} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700 bg-surface-elevated px-4 py-3 text-sm">
            <div>
              <div className="font-medium">{String(c.name)}</div>
              <div className="text-xs text-slate-400">
                {String(c.connector_type)} · health={String(c.health_status)} · enabled={String(c.enabled)} · secret={String(c.hasSecretRef)}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="rounded-md border border-slate-600 px-3 py-1 text-xs" onClick={() => test(String(c.id))}>Test</button>
              <button type="button" className="rounded-md border border-slate-600 px-3 py-1 text-xs" onClick={() => toggle(String(c.id), !!c.enabled)}>
                {c.enabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
