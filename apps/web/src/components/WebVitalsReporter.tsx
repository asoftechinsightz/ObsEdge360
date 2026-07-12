'use client';

import { useEffect } from 'react';

type Metric = { name: string; value: number; rating?: string };

/**
 * Lightweight Web Vitals reporter without extra dependency (UX-1F).
 * Uses PerformanceObserver; logs to console in non-production; stores last sample in sessionStorage.
 */
export function WebVitalsReporter() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;

    const store = (m: Metric) => {
      try {
        const prev = JSON.parse(sessionStorage.getItem('oe360_vitals') || '{}');
        prev[m.name] = { value: Math.round(m.value), rating: m.rating, at: Date.now() };
        sessionStorage.setItem('oe360_vitals', JSON.stringify(prev));
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.info(`[OE360 vitals] ${m.name}=${Math.round(m.value)}${m.rating ? ` (${m.rating})` : ''}`);
        }
      } catch {
        /* ignore */
      }
    };

    try {
      const po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            store({ name: 'LCP', value: entry.startTime });
          }
          if (entry.entryType === 'layout-shift' && !(entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput) {
            const ls = entry as PerformanceEntry & { value: number };
            store({ name: 'CLS', value: (Number(sessionStorage.getItem('oe360_cls') || 0) || 0) + ls.value });
            sessionStorage.setItem('oe360_cls', String((Number(sessionStorage.getItem('oe360_cls') || 0) || 0) + ls.value));
          }
          if (entry.entryType === 'event' || entry.entryType === 'first-input') {
            const e = entry as PerformanceEntry & { processingStart?: number; duration: number };
            const delay = e.processingStart != null ? e.processingStart - e.startTime : e.duration;
            store({ name: 'INP', value: delay });
          }
        }
      });
      po.observe({ type: 'largest-contentful-paint', buffered: true } as PerformanceObserverInit);
      po.observe({ type: 'layout-shift', buffered: true } as PerformanceObserverInit);
      try {
        po.observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
      } catch {
        po.observe({ type: 'first-input', buffered: true } as PerformanceObserverInit);
      }
      return () => po.disconnect();
    } catch {
      return undefined;
    }
  }, []);

  return null;
}
