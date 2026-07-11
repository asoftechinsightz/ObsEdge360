'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../../AdminShell';

const TABS = ['general', 'secrets', 'password', 'session', 'rotation', 'audit', 'certificates'] as const;

export default function SystemSecurityPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('general');
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [msg, setMsg] = useState('');
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
  const [sess, setSess] = useState({
    idleTimeoutMinutes: 30,
    absoluteTimeoutHours: 12,
    maxConcurrentSessions: 5,
    deviceTracking: true,
    forcedLogoutEnabled: true,
    sessionAudit: true,
  });
  const [pem, setPem] = useState('');
  const [certName, setCertName] = useState('edge-tls');

  const load = () =>
    apiClient<Record<string, unknown>>('/admin/system/security').then((d) => {
      setData(d);
      const policies = (d.policies as Array<{ policy_type: string; config: Record<string, unknown> }>) || [];
      const p = policies.find((x) => x.policy_type === 'password')?.config;
      const s = policies.find((x) => x.policy_type === 'session')?.config;
      if (p) setPwd((prev) => ({ ...prev, ...p } as typeof prev));
      if (s) setSess((prev) => ({ ...prev, ...s } as typeof prev));
    });

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  async function savePassword() {
    try {
      await apiClient('/admin/system/security/password', { method: 'PUT', body: JSON.stringify(pwd) });
      setMsg('Password policy saved');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function saveSession() {
    try {
      await apiClient('/admin/system/security/session', { method: 'PUT', body: JSON.stringify(sess) });
      setMsg('Session policy saved');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function uploadCert() {
    try {
      await apiClient('/admin/system/security/certificates', {
        method: 'POST',
        body: JSON.stringify({ name: certName, pemPublic: pem, purpose: 'tls' }),
      });
      setMsg('Certificate uploaded & validated');
      setPem('');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="System Security">
      <p className="mb-3 text-sm text-slate-400">
        Enterprise security administration — Wave {String(data?.wave ?? '6')}. Glass panels · dark theme · WCAG-friendly contrast.
      </p>
      {msg && <p className="mb-3 text-sm text-slate-200">{msg}</p>}
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              tab === t
                ? 'rounded-lg bg-slate-100/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur'
                : 'rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-xl backdrop-blur-md">
        {tab === 'general' && (
          <pre className="overflow-auto text-xs text-slate-300">{JSON.stringify({ wave: data?.wave, gaClaim: data?.gaClaim, tabs: data?.tabs }, null, 2)}</pre>
        )}
        {tab === 'secrets' && (
          <p className="text-sm text-slate-300">
            Use Secrets store APIs and Secret Validation. Rotation jobs are under the Rotation tab. Auto-rotate requires{' '}
            <code className="text-slate-100">SECRETS_AUTO_ROTATE=true</code>.
          </p>
        )}
        {tab === 'password' && (
          <div className="space-y-3 text-sm">
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
            <button type="button" className="rounded-md bg-primary px-4 py-2 text-white" onClick={savePassword}>
              Save password policy
            </button>
          </div>
        )}
        {tab === 'session' && (
          <div className="space-y-3 text-sm">
            {Object.entries(sess).map(([k, v]) => (
              <label key={k} className="flex items-center justify-between gap-4">
                <span className="text-slate-400">{k}</span>
                {typeof v === 'boolean' ? (
                  <input type="checkbox" checked={!!v} onChange={(e) => setSess({ ...sess, [k]: e.target.checked })} />
                ) : (
                  <input
                    className="w-40 rounded-md border border-slate-600 bg-slate-950 px-2 py-1"
                    value={String(v)}
                    onChange={(e) => setSess({ ...sess, [k]: Number(e.target.value) })}
                  />
                )}
              </label>
            ))}
            <button type="button" className="rounded-md bg-primary px-4 py-2 text-white" onClick={saveSession}>
              Save session policy
            </button>
          </div>
        )}
        {tab === 'rotation' && <RotationPanel onDone={() => load().catch(() => undefined)} />}
        {tab === 'audit' && <SecurityAuditPanel />}
        {tab === 'certificates' && (
          <div className="space-y-3">
            <input
              className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm"
              value={certName}
              onChange={(e) => setCertName(e.target.value)}
              placeholder="Certificate name"
            />
            <textarea
              className="h-40 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 font-mono text-xs"
              placeholder="-----BEGIN CERTIFICATE-----"
              value={pem}
              onChange={(e) => setPem(e.target.value)}
            />
            <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={uploadCert}>
              Upload & validate
            </button>
            <pre className="overflow-auto text-xs text-slate-300">{JSON.stringify(data?.certificates, null, 2)}</pre>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function RotationPanel({ onDone }: { onDone: () => void }) {
  const [secretId, setSecretId] = useState('');
  const [jobs, setJobs] = useState<unknown>(null);
  const [msg, setMsg] = useState('');
  const refresh = () =>
    apiClient('/admin/system/security/rotation').then(setJobs).catch((e: Error) => setMsg(e.message));
  useEffect(() => {
    refresh();
  }, []);
  async function createJob() {
    try {
      await apiClient('/admin/system/security/rotation', {
        method: 'POST',
        body: JSON.stringify({ secretId, scheduleCron: '0 3 * * 0', notifyBeforeDays: 14, autoRotate: false }),
      });
      setMsg('Rotation job created');
      setSecretId('');
      await refresh();
      onDone();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  async function notify() {
    try {
      await apiClient('/admin/system/security/rotation/notify', { method: 'POST', body: '{}' });
      setMsg('Expiry notifications scanned');
      await refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  return (
    <div className="space-y-3">
      {msg && <p className="text-sm text-slate-300">{msg}</p>}
      <div className="flex flex-wrap gap-2">
        <input
          className="min-w-[16rem] flex-1 rounded-md border border-slate-600 bg-slate-950 px-3 py-2 font-mono text-xs"
          placeholder="Secret UUID"
          value={secretId}
          onChange={(e) => setSecretId(e.target.value)}
        />
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={createJob}>
          Create job
        </button>
        <button type="button" className="rounded-md border border-slate-600 px-4 py-2 text-sm" onClick={notify}>
          Scan expiry warnings
        </button>
      </div>
      <pre className="overflow-auto text-xs text-slate-300">{JSON.stringify(jobs, null, 2)}</pre>
    </div>
  );
}

function SecurityAuditPanel() {
  const [events, setEvents] = useState<unknown[]>([]);
  useEffect(() => {
    apiClient<{ events: unknown[] }>('/admin/system/security/audit')
      .then((d) => setEvents(d.events))
      .catch(() => setEvents([]));
  }, []);
  return <pre className="overflow-auto text-xs text-slate-300">{JSON.stringify(events, null, 2)}</pre>;
}
