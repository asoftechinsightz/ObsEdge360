'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { Plus, Trash2, RefreshCw } from 'lucide-react';

interface Provider {
  id: string;
  name: string;
  protocol: 'oidc' | 'saml';
  enabled: boolean;
  issuer?: string;
  clientId?: string;
  hasClientSecret?: boolean;
  scopes?: string;
  entryPoint?: string;
  idpEntityId?: string;
  hasIdpCert?: boolean;
  allowedDomains?: string[];
}

export default function SsoSettingsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    protocol: 'oidc' as 'oidc' | 'saml',
    issuer: '',
    clientId: '',
    clientSecret: '',
    scopes: 'openid email profile',
    entryPoint: '',
    idpEntityId: '',
    idpCert: '',
    allowedDomains: '',
  });

  const load = useCallback(async () => {
    try {
      const data = await apiClient<Provider[]>('/auth/sso/admin/providers');
      setProviders(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SSO providers (admin + DB required)');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await apiClient('/auth/sso/admin/providers', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          protocol: form.protocol,
          enabled: true,
          issuer: form.issuer || undefined,
          clientId: form.clientId || undefined,
          clientSecret: form.clientSecret || undefined,
          scopes: form.scopes || undefined,
          entryPoint: form.entryPoint || undefined,
          idpEntityId: form.idpEntityId || undefined,
          idpCert: form.idpCert || undefined,
          allowedDomains: form.allowedDomains
            ? form.allowedDomains.split(',').map((d) => d.trim()).filter(Boolean)
            : [],
        }),
      });
      setMessage('SSO provider saved');
      setForm({
        name: '',
        protocol: 'oidc',
        issuer: '',
        clientId: '',
        clientSecret: '',
        scopes: 'openid email profile',
        entryPoint: '',
        idpEntityId: '',
        idpCert: '',
        allowedDomains: '',
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this SSO provider?')) return;
    await apiClient(`/auth/sso/admin/providers/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">SSO settings</h1>
          <p className="text-sm text-slate-400">OIDC (Okta, Azure AD, Keycloak) and SAML 2.0</p>
        </div>
        <button type="button" onClick={() => load()} className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {message && <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{message}</div>}
      {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-700 bg-surface-elevated p-5">
          <h2 className="font-medium">Add provider</h2>
          <input required placeholder="Display name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
          <select value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value as 'oidc' | 'saml' })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm">
            <option value="oidc">OIDC</option>
            <option value="saml">SAML 2.0</option>
          </select>

          {form.protocol === 'oidc' ? (
            <>
              <input required placeholder="Issuer URL (https://login.microsoftonline.com/.../v2.0)" value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
              <input required placeholder="Client ID" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
              <input placeholder="Client secret" value={form.clientSecret} onChange={(e) => setForm({ ...form, clientSecret: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
              <input placeholder="Scopes" value={form.scopes} onChange={(e) => setForm({ ...form, scopes: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
            </>
          ) : (
            <>
              <input required placeholder="IdP SSO URL (entry point)" value={form.entryPoint} onChange={(e) => setForm({ ...form, entryPoint: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
              <input placeholder="SP Entity ID (optional)" value={form.idpEntityId} onChange={(e) => setForm({ ...form, idpEntityId: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
              <textarea required placeholder="IdP X.509 certificate (PEM)" value={form.idpCert} onChange={(e) => setForm({ ...form, idpCert: e.target.value })} rows={4} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 font-mono text-xs" />
            </>
          )}

          <input placeholder="Allowed email domains (comma-separated)" value={form.allowedDomains} onChange={(e) => setForm({ ...form, allowedDomains: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />

          <p className="text-xs text-slate-500">
            OIDC callback: <code className="text-slate-300">/api/v1/auth/sso/oidc/callback</code><br />
            SAML ACS: <code className="text-slate-300">/api/v1/auth/sso/saml/acs</code>
          </p>

          <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm text-white">
            <Plus size={16} /> Save provider
          </button>
        </form>

        <div className="space-y-3">
          <h2 className="font-medium">Configured providers</h2>
          {providers.map((p) => (
            <div key={p.id} className="flex items-start justify-between rounded-xl border border-slate-700 bg-surface-elevated px-4 py-3">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-slate-500">
                  {p.protocol.toUpperCase()}
                  {p.issuer ? ` · ${p.issuer}` : ''}
                  {p.entryPoint ? ` · ${p.entryPoint}` : ''}
                  {p.allowedDomains?.length ? ` · domains: ${p.allowedDomains.join(', ')}` : ''}
                </div>
              </div>
              <button type="button" onClick={() => remove(p.id)} className="text-red-400"><Trash2 size={16} /></button>
            </div>
          ))}
          {providers.length === 0 && <p className="text-sm text-slate-500">No SSO providers yet</p>}
        </div>
      </div>
    </DashboardShell>
  );
}
