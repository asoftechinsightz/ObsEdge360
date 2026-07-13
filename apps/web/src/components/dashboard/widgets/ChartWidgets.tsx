'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartWidget } from '@opsedge360/shared-types';
import type { ChartWidgetsProps } from './WidgetViews';
import { markWidgetRender } from '@/hooks/useDashboardTelemetry';
import { useEffect, useRef } from 'react';

function ChartPanel({ widget, dataMode }: { widget: ChartWidget; dataMode?: string }) {
  const start = useRef(performance.now());
  useEffect(() => {
    markWidgetRender(widget.id, Math.round(performance.now() - start.current));
  }, [widget.id]);

  const primary = widget.series[0];
  const data = (primary?.data ?? []).map((p) => ({ day: p.x, value: p.y, name: primary.name }));

  return (
    <div className="eig-panel p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">{widget.title}</h3>
        <span className="text-[10px] uppercase tracking-wide text-slate-500">
          {dataMode === 'illustrative' ? 'Illustrative' : 'Live'}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        {widget.chartType === 'bar' ? (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={11} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
            <Legend />
            <Bar dataKey="value" fill={widget.id.includes('incident') ? '#f87171' : '#38bdf8'} name={primary?.name ?? 'Value'} radius={3} />
          </BarChart>
        ) : (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
            <YAxis domain={widget.id.includes('availability') ? [99.5, 100] : undefined} stroke="#64748b" fontSize={11} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} dot={false} name={primary?.name ?? 'Value'} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function ChartWidgets({ charts, dataMode }: ChartWidgetsProps) {
  if (!charts.length) return null;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {charts.map((c) => (
        <ChartPanel key={c.id} widget={c} dataMode={dataMode} />
      ))}
    </div>
  );
}
