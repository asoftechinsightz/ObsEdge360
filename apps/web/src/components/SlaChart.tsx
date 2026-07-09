'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const DATA = [
  { day: 'Mon', availability: 99.91, sla: 99.90 },
  { day: 'Tue', availability: 99.93, sla: 99.90 },
  { day: 'Wed', availability: 99.88, sla: 99.90 },
  { day: 'Thu', availability: 99.95, sla: 99.90 },
  { day: 'Fri', availability: 99.92, sla: 99.90 },
  { day: 'Sat', availability: 99.97, sla: 99.90 },
  { day: 'Sun', availability: 99.94, sla: 99.90 },
];

export function SlaChart() {
  return (
    <div className="rounded-xl border border-slate-700 bg-surface-elevated p-5">
      <h2 className="mb-4 font-semibold">SLA Trend (7 days)</h2>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={DATA}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
          <YAxis domain={[99.8, 100]} stroke="#64748b" fontSize={12} />
          <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
          <Legend />
          <Line type="monotone" dataKey="availability" stroke="#0ea5e9" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="sla" stroke="#64748b" strokeDasharray="5 5" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
