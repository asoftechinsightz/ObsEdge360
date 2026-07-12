'use client';

import { emptyCvpState, type CvpState } from './types';

const KEY = 'oe360_cvp_v1';

export function loadCvpState(): CvpState {
  if (typeof window === 'undefined') return emptyCvpState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyCvpState();
    const parsed = JSON.parse(raw) as CvpState;
    if (parsed?.version !== 1) return emptyCvpState();
    return {
      ...emptyCvpState(),
      ...parsed,
      pilots: parsed.pilots || [],
      feedback: parsed.feedback || [],
      features: parsed.features || [],
      releases: parsed.releases || [],
    };
  } catch {
    return emptyCvpState();
  }
}

export function saveCvpState(state: CvpState): void {
  const next = { ...state, updatedAt: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('opsedge:cvp'));
}

export function exportCvpJson(): string {
  return JSON.stringify(loadCvpState(), null, 2);
}

export function importCvpJson(raw: string): CvpState {
  const parsed = JSON.parse(raw) as CvpState;
  if (parsed?.version !== 1) throw new Error('Invalid CVP export (expected version 1)');
  saveCvpState(parsed);
  return parsed;
}

export function useCvpReload(cb: () => void): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('opsedge:cvp', cb);
}
