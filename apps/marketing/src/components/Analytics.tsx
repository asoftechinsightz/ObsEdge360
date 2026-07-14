'use client';

import { useEffect } from 'react';

/** Lightweight analytics bridge — wire GTM ID via NEXT_PUBLIC_GTM_ID */
export function Analytics() {
  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_GTM_ID;
    if (!id || document.getElementById('azi-gtm')) return;

    const s = document.createElement('script');
    s.id = 'azi-gtm';
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtm.js?id=${id}`;
    document.head.appendChild(s);

    const w = window as Window & { dataLayer?: unknown[] };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  }, []);

  return null;
}
