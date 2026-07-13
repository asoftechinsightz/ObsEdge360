'use client';

import { useEffect, useRef } from 'react';

export type DashboardTelemetryEvent = {
  dashboardLoadMs?: number;
  apiDurationMs?: number;
  renderMs?: number;
  cacheHit?: boolean;
  requestId?: string;
  widgetCount?: number;
  apiCalls: number;
  timestamp: string;
};

const STORAGE_KEY = 'oe360_dashboard_telemetry';

export function recordDashboardTelemetry(event: DashboardTelemetryEvent): void {
  if (typeof window === 'undefined') return;
  try {
    const prev = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]') as DashboardTelemetryEvent[];
    prev.push(event);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(prev.slice(-20)));
    window.dispatchEvent(new CustomEvent('opsedge:dashboard-telemetry', { detail: event }));
  } catch {
    /* ignore */
  }
}

export function useDashboardRenderTelemetry(
  deps: unknown[],
  meta: Omit<DashboardTelemetryEvent, 'renderMs' | 'timestamp'>,
): void {
  const started = useRef<number | null>(null);
  useEffect(() => {
    started.current = performance.now();
    return () => {
      started.current = null;
    };
  }, []);

  useEffect(() => {
    if (started.current == null) started.current = performance.now();
    const renderMs = Math.round(performance.now() - started.current);
    recordDashboardTelemetry({
      ...meta,
      renderMs,
      timestamp: new Date().toISOString(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function markWidgetRender(widgetId: string, durationMs: number): void {
  if (typeof window === 'undefined') return;
  try {
    const key = 'oe360_widget_render';
    const prev = JSON.parse(sessionStorage.getItem(key) ?? '{}') as Record<string, number[]>;
    const list = prev[widgetId] ?? [];
    list.push(durationMs);
    prev[widgetId] = list.slice(-10);
    sessionStorage.setItem(key, JSON.stringify(prev));
  } catch {
    /* ignore */
  }
}
