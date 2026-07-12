'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { bump, trackNavPath, trackPageView, trackTimeOnPage } from '@/lib/cvp/analytics';

/** Privacy-respecting aggregated usage — CVP Workstream 4. */
export function CvpAnalyticsListener() {
  const pathname = usePathname();
  const prev = useRef<string | null>(null);
  const entered = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    if (prev.current) {
      trackTimeOnPage(prev.current, now - entered.current);
      trackNavPath(prev.current, pathname);
    }
    trackPageView(pathname);
    prev.current = pathname;
    entered.current = now;
  }, [pathname]);

  useEffect(() => {
    const onErr = () => bump('errors');
    window.addEventListener('error', onErr);
    return () => window.removeEventListener('error', onErr);
  }, []);

  return null;
}
