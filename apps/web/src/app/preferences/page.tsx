'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';

export default function PreferencesPage() {
  const [theme, setTheme] = useState('dark');
  const [landing, setLanding] = useState('/dashboard');
  const [mfa, setMfa] = useState<unknown>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    apiClient<{ theme?: string; landing_path?: string }>('/me/preferences')
      .then((p) => {
        setTheme(p.theme || 'dark');
        setLanding(p.landing_path || '/dashboard');
        document.documentElement.setAttribute('data-theme', p.theme === 'light' ? 'light' : 'dark');
      })
      .catch(() => undefined);
    apiClient('/me/mfa').then(setMfa).catch(() => undefined);
  }, []);

  const save = async () => {
    await apiClient('/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ theme, landingPath: landing }),
    });
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
    setMsg('Saved');
  };

  return (
    <DashboardShell>
      <h1 className="mb-2 text-2xl font-semibold">User Preferences</h1>
      <p className="mb-4 text-sm text-slate-400">Theme, landing page, MFA readiness framework.</p>
      {msg && <p className="mb-2 text-sm text-sky-200">{msg}</p>}
      <div className="max-w-lg space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <label className="block text-sm">
          Theme
          <select className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2" value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
        <label className="block text-sm">
          Landing path
          <select className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2" value={landing} onChange={(e) => setLanding(e.target.value)}>
            <option value="/dashboard">Executive Home</option>
            <option value="/ops-intelligence">Ops Intelligence</option>
            <option value="/reports">Executive Reports</option>
            <option value="/itsm">ITSM</option>
            <option value="/synthetics">Synthetics</option>
          </select>
        </label>
        <button type="button" className="rounded bg-sky-600 px-4 py-2 text-sm text-white" onClick={() => save().catch((e: Error) => setMsg(e.message))}>
          Save
        </button>
      </div>
      <h2 className="mb-2 mt-6 text-lg font-medium">MFA framework</h2>
      <pre className="overflow-auto rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs">{JSON.stringify(mfa, null, 2)}</pre>
    </DashboardShell>
  );
}
