/** Debug / Developer Mode — presentation gate only (UX-1). */

const KEY = 'oe360_debug_mode';

export function isDebugMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get('debug') === '1') return true;
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setDebugMode(on: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, on ? '1' : '0');
  window.dispatchEvent(new Event('opsedge:debug-mode'));
}
