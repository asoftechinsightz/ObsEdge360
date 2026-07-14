'use client';

import { useEffect, useState } from 'react';

/** Prefer static / CSS visuals on small screens and reduced-motion. */
export function usePreferLightweightVisuals() {
  const [lightweight, setLightweight] = useState(true);

  useEffect(() => {
    const mqMobile = window.matchMedia('(max-width: 1023px)');
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setLightweight(mqMobile.matches || mqMotion.matches);
    sync();
    mqMobile.addEventListener('change', sync);
    mqMotion.addEventListener('change', sync);
    return () => {
      mqMobile.removeEventListener('change', sync);
      mqMotion.removeEventListener('change', sync);
    };
  }, []);

  return lightweight;
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return reduced;
}
