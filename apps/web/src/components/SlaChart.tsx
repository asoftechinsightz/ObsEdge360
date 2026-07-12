'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { apiClient } from '@/lib/api-client';

type Point = { day: string; availability?: number; sla?: number; incidents?: number; mttr?: number };

const ILLUSTRATIVE: Point[] = [
  { day: 'Mon', availability: 99.91, sla: 99.9, incidents: 5, mttr: 42 },
  { day: 'Tue', availability: 99.93, sla: 99.9, incidents: 3, mttr: 35 },
  { day: 'Wed', availability: 99.88, sla: 99.9, incidents: 7, mttr: 55 },
  { day: 'Thu', availability: 99.95, sla: 99.9, incidents: 2, mttr: 28 },
  { day: 'Fri', availability: 99.92, sla: 99.9, incidents: 4, mttr: 40 },
  { day: 'Sat', availability: 99.97, sla: 99.9, incidents: 1, mttr: 22 },
  { day: 'Sun', availability: 99.94, sla: 99.9, incidents: 2, mttr: 30 },
];

export function ExecutiveTrendCharts() {
  const [data, setData] = useState<Point[]>(ILLUSTRATIVE);
  const [mode, setMode] = useState<'live' | 'illustrative'>('illustrative');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient<{ points?: Point[]; series?: Point[] }>('/executive/trends').catch(() => null);
        const points = res?.points || res?.series;
        if (!cancelled && Array.isArray(points) && points.length) {
          setData(points);
          setMode('live');
        }
      } catch {
        /* keep illustrative */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="eig-glass p-5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className="font-semibold">SLA & availability (7 days)</h2>
          <span className="text-[10px] uppercase tracking-wide text-slate-500">
            {mode === 'live' ? 'Live' : 'Illustrative sample'}
          </span>
        </div>
        <p className="mb-3 text-xs text-slate-500" aria-hidden={false}>
          Availability vs SLA target. {mode === 'illustrative' ? 'Sample preview until trend API is populated.' : 'Live series.'}
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
            <YAxis domain={[99.8, 100]} stroke="#64748b" fontSize={12} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
            <Legend />
            <Line type="monotone" dataKey="availability" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Availability" />
            <Line type="monotone" dataKey="sla" stroke="#64748b" strokeDasharray="5 5" dot={false} name="SLA target" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="eig-glass p-5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className="font-semibold">Incidents & MTTR</h2>
          <span className="text-[10px] uppercase tracking-wide text-slate-500">
            {mode === 'live' ? 'Live' : 'Illustrative sample'}
          </span>
        </div>
        <p className="mb-3 text-xs text-slate-500">Incident volume and mean time to restore (minutes).</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
            <Legend />
            <Bar dataKey="incidents" fill="#f87171" name="Incidents" radius={4} />
            <Bar dataKey="mttr" fill="#38bdf8" name="MTTR (min)" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** @deprecated use ExecutiveTrendCharts — kept for imports */
export function SlaChart() {
  return <ExecutiveTrendCharts />;
}
