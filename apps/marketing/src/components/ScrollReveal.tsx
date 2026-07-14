'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { usePrefersReducedMotion } from '@/lib/visual-prefs';

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
};

/** Scroll reveal — content stays readable if JS/hydration is slow. */
export function ScrollReveal({ children, className, delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    if (reduce) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const inView = rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
    if (inView) {
      setVisible(true);
      return;
    }

    setVisible(false);
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: '80px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [reduce]);

  return (
    <div
      ref={ref}
      className={clsx(
        'transition-all duration-700 ease-out',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        className,
      )}
      style={{ transitionDelay: reduce || visible ? undefined : `${delay * 1000}ms` }}
    >
      {children}
    </div>
  );
}
