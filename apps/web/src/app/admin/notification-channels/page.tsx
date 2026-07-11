'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function NotificationChannelsPage() {
  const [channels, setChannels] = useState<Array<Record<string, unknown>>>([]);
  const [name, setName] = useState('Ops webhook');
  const [url, setUrl] = useState('');
  const [msg, setMsg] = useState('');

  const load = () =>
    apiClient<{ channels: Array<Record<string, unknown>> }>('/integrations/notifications').then((d) =>
      setChannels(d.channels),
    );

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  async function create() {
    try {
      await apiClient('/integrations/notifications', {
        method: 'POST',
        body: JSON.stringify({
          name,
          channelType: 'webhook',
          config: { webhookUrl: url },
          severityRoutes: ['critical', 'high', 'medium', 'low', 'info'],
          template: { subject: '{{severity}}: {{title}}', body: '{{message}}' },
        }),
      });
      setMsg('Channel created');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function deliver(id: string) {
    try {
      const r = await apiClient('/integrations/notifications/deliver', {
        method: 'POST',
        body: JSON.stringify({ channelId: id, severity: 'info', title: 'Test', message: 'OpsEdge360 delivery test' }),
      });
      setMsg(JSON.stringify(r));
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="Notification Channels">
      <p className="mb-3 text-sm text-slate-400">Email · Slack · Teams · Webhook with templates, retries, and DLQ.</p>
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <div className="mb-4 flex flex-wrap gap-2">
        <input className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="min-w-[220px] flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm" placeholder="Webhook URL" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={create}>Create</button>
      </div>
      <div className="space-y-2">
        {channels.map((c) => (
          <div key={String(c.id)} className="flex items-center justify-between rounded-xl border border-slate-700 bg-surface-elevated px-4 py-3 text-sm">
            <div>
              <div className="font-medium">{String(c.name)}</div>
              <div className="text-xs text-slate-400">{String(c.channel_type)} · enabled={String(c.enabled)}</div>
            </div>
            <button type="button" className="rounded-md border border-slate-600 px-3 py-1 text-xs" onClick={() => deliver(String(c.id))}>
              Test deliver
            </button>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
