/** Project APEX — presentation / demo mode (client-only, no backend change). */

const PRESENTATION_KEY = 'oe360_presentation_mode';
const DEMO_KEY = 'oe360_executive_demo';

export function isPresentationMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(PRESENTATION_KEY) === '1';
  } catch {
    return false;
  }
}

export function setPresentationMode(on: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PRESENTATION_KEY, on ? '1' : '0');
  document.documentElement.setAttribute('data-apex-presentation', on ? '1' : '0');
  window.dispatchEvent(new Event('opsedge:apex-mode'));
}

export function isExecutiveDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DEMO_KEY) === '1';
  } catch {
    return false;
  }
}

export function setExecutiveDemoMode(on: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DEMO_KEY, on ? '1' : '0');
  if (on) setPresentationMode(true);
  window.dispatchEvent(new Event('opsedge:apex-mode'));
}

export function syncApexDomFlags(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-apex-presentation', isPresentationMode() ? '1' : '0');
  document.documentElement.setAttribute('data-apex-demo', isExecutiveDemoMode() ? '1' : '0');
}
