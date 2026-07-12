'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Soft page enter + performance marks (UX-1A / UX-1F). */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    try {
      performance.mark('oe360:route-start');
      requestAnimationFrame(() => {
        performance.mark('oe360:shell-ready');
        performance.measure('oe360:nav-to-shell', 'oe360:route-start', 'oe360:shell-ready');
      });
    } catch {
      /* ignore */
    }
  }, [pathname]);

  return (
    <div key={pathname} className="eig-page-enter min-h-[40vh]">
      {children}
    </div>
  );
}
