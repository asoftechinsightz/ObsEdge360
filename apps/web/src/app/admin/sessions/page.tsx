'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<Array<Record<string, unknown>>>([]);
  const [msg, setMsg] = useState('');

  const load = () =>
    apiClient<{ sessions: Array<Record<string, unknown>> }>('/admin/sessions').then((d) => setSessions(d.sessions));

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  async function revoke(id: string) {
    try {
      await apiClient(`/admin/sessions/${id}/revoke`, { method: 'POST', body: '{}' });
      setMsg('Session revoked');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="Session Management">
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <div className="space-y-2">
        {sessions.map((s) => (
          <div key={String(s.id)} className="flex items-center justify-between rounded-xl border border-slate-700 bg-surface-elevated px-4 py-3 text-sm">
            <div>
              <div>{String(s.device_label ?? 'device')} · {String(s.user_id)}</div>
              <div className="text-xs text-slate-400">last={String(s.last_seen_at)} revoked={String(s.revoked_at ?? '—')}</div>
            </div>
            {!s.revoked_at && (
              <button type="button" className="rounded-md border border-slate-600 px-3 py-1 text-xs" onClick={() => revoke(String(s.id))}>
                Force logout
              </button>
            )}
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
