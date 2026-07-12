/** Aggregated product analytics — no PII profiling (CVP Workstream 4). */

const KEY = 'oe360_cvp_analytics_v1';
const MAX_SEARCH = 40;
const MAX_PATHS = 30;

export type AnalyticsSnapshot = {
  pageViews: Record<string, number>;
  searches: Record<string, number>;
  dashboardClicks: number;
  reportGenerations: number;
  copilotOpens: number;
  copilotMessages: number;
  inlineAiRuns: number;
  errors: number;
  timeOnPageMs: Record<string, number>;
  navPaths: string[]; // last N from→to
  updatedAt: string;
};

function empty(): AnalyticsSnapshot {
  return {
    pageViews: {},
    searches: {},
    dashboardClicks: 0,
    reportGenerations: 0,
    copilotOpens: 0,
    copilotMessages: 0,
    inlineAiRuns: 0,
    errors: 0,
    timeOnPageMs: {},
    navPaths: [],
    updatedAt: new Date().toISOString(),
  };
}

export function loadAnalytics(): AnalyticsSnapshot {
  if (typeof window === 'undefined') return empty();
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch {
    return empty();
  }
}

function save(s: AnalyticsSnapshot) {
  s.updatedAt = new Date().toISOString();
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function trackPageView(path: string) {
  const s = loadAnalytics();
  const key = path.split('?')[0] || '/';
  s.pageViews[key] = (s.pageViews[key] || 0) + 1;
  save(s);
}

export function trackSearch(term: string) {
  const t = term.trim().toLowerCase().slice(0, 64);
  if (!t) return;
  const s = loadAnalytics();
  s.searches[t] = (s.searches[t] || 0) + 1;
  // prune
  const entries = Object.entries(s.searches).sort((a, b) => b[1] - a[1]).slice(0, MAX_SEARCH);
  s.searches = Object.fromEntries(entries);
  save(s);
}

export function trackNavPath(from: string, to: string) {
  const s = loadAnalytics();
  s.navPaths = [`${from}→${to}`, ...s.navPaths].slice(0, MAX_PATHS);
  save(s);
}

export function trackTimeOnPage(path: string, ms: number) {
  if (ms < 500) return;
  const s = loadAnalytics();
  const key = path.split('?')[0] || '/';
  s.timeOnPageMs[key] = (s.timeOnPageMs[key] || 0) + ms;
  save(s);
}

export function bump(counter: keyof Pick<
  AnalyticsSnapshot,
  'dashboardClicks' | 'reportGenerations' | 'copilotOpens' | 'copilotMessages' | 'inlineAiRuns' | 'errors'
>) {
  const s = loadAnalytics();
  s[counter] = (s[counter] || 0) + 1;
  save(s);
}

export function rankedPages(views: Record<string, number>, limit = 10, order: 'desc' | 'asc' = 'desc') {
  const entries = Object.entries(views).sort((a, b) => (order === 'desc' ? b[1] - a[1] : a[1] - b[1]));
  return entries.slice(0, limit);
}
