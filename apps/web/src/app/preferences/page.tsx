'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { PageHeader, DescriptionList, JsonViewer, StatusBadge } from '@/components/eig/primitives';
import { SuccessBanner } from '@/components/UiStates';
import { isDebugMode } from '@/lib/debug-mode';

export default function PreferencesPage() {
  const [theme, setTheme] = useState('dark');
  const [landing, setLanding] = useState('/dashboard');
  const [roleHint, setRoleHint] = useState('cio');
  const [mfa, setMfa] = useState<Record<string, unknown> | null>(null);
  const [msg, setMsg] = useState('');
  const [debug, setDebug] = useState(false);

  useEffect(() => {
    setDebug(isDebugMode());
    apiClient<{ theme?: string; landing_path?: string }>('/me/preferences')
      .then((p) => {
        setTheme(p.theme || 'dark');
        setLanding(p.landing_path || '/dashboard');
        document.documentElement.setAttribute('data-theme', p.theme === 'light' ? 'light' : 'dark');
      })
      .catch(() => undefined);
    apiClient<Record<string, unknown>>('/me/mfa')
      .then(setMfa)
      .catch(() => undefined);
  }, []);

  const save = async () => {
    await apiClient('/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ theme, landingPath: landing }),
    });
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
    try {
      localStorage.setItem('oe360_role_hint', roleHint);
    } catch {
      /* ignore */
    }
    setMsg('Saved — landing path applies on next login');
  };

  const mfaEnabled = Boolean(mfa && (mfa.enabled === true || mfa.enrolled === true || mfa.status === 'enabled'));

  return (
    <DashboardShell>
      <PageHeader title="User Preferences" purpose="Theme, landing page, and security readiness for your account." />
      {msg && <SuccessBanner message={msg} />}
      <div className="max-w-lg space-y-3 eig-panel p-4">
        <label className="block text-sm">
          Theme
          <select
            className="mt-1 w-full rounded-[var(--eig-radius-sm)] border border-slate-600 bg-slate-950 px-3 py-2"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
        <label className="block text-sm">
          Landing page
          <select
            className="mt-1 w-full rounded-[var(--eig-radius-sm)] border border-slate-600 bg-slate-950 px-3 py-2"
            value={landing}
            onChange={(e) => setLanding(e.target.value)}
          >
            <option value="/dashboard">Executive Home (CIO / Business)</option>
            <option value="/ops-intelligence">Ops Intelligence (NOC / SRE / CTO)</option>
            <option value="/security">Security Center (CISO)</option>
            <option value="/admin">Enterprise Admin (Platform / Admin)</option>
            <option value="/reports">Executive Reports</option>
            <option value="/itsm">ITSM</option>
            <option value="/synthetics">Synthetics</option>
            <option value="/observability">Observability</option>
            <option value="/apm">APM</option>
          </select>
        </label>
        <label className="block text-sm">
          Role hint (local UX emphasis)
          <select
            className="mt-1 w-full rounded-[var(--eig-radius-sm)] border border-slate-600 bg-slate-950 px-3 py-2"
            value={roleHint}
            onChange={(e) => setRoleHint(e.target.value)}
          >
            <option value="cio">CIO / Business Executive</option>
            <option value="cto">CTO</option>
            <option value="ciso">CISO</option>
            <option value="noc">NOC Engineer</option>
            <option value="sre">SRE</option>
            <option value="platform">Platform Engineer</option>
            <option value="admin">Administrator</option>
          </select>
        </label>
        <button
          type="button"
          className="rounded-[var(--eig-radius-sm)] bg-sky-600 px-4 py-2 text-sm text-white"
          onClick={() => save().catch((e: Error) => setMsg(e.message))}
        >
          Save
        </button>
      </div>
      <h2 className="mb-2 mt-6 text-lg font-medium">MFA status</h2>
      <DescriptionList
        items={[
          {
            label: 'Multi-factor authentication',
            value: (
              <span className="inline-flex items-center gap-2">
                <StatusBadge status={mfaEnabled ? 'success' : 'warning'} />
                {mfaEnabled ? 'Enabled' : 'Not enabled — open Security Center to enroll'}
              </span>
            ),
          },
        ]}
      />
      {debug && mfa && <JsonViewer data={mfa} title="MFA API payload" />}
    </DashboardShell>
  );
}
