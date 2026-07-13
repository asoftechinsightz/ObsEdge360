/**
 * Pure helpers for Twin health propagation / blast priority (unit-tested).
 * Customer vocabulary only — no engine vendor names.
 */

export type TwinHealth = 'healthy' | 'degraded' | 'critical' | 'unknown';

export function healthFromScore(score: number): TwinHealth {
  if (score >= 90) return 'healthy';
  if (score >= 70) return 'degraded';
  if (score > 0) return 'critical';
  return 'unknown';
}

/** Worst-wins rollup: business service health is the minimum CI health score. */
export function propagateHealthFromDependencies(scores: number[]): {
  healthScore: number;
  health: TwinHealth;
} {
  if (!scores.length) return { healthScore: 92, health: 'healthy' };
  const healthScore = Math.min(...scores.map((s) => Number(s)));
  return { healthScore, health: healthFromScore(healthScore) };
}

export function priorityFrom(
  health: TwinHealth,
  revenue: number,
): 'P1' | 'P2' | 'P3' | 'P4' {
  if (health === 'critical' || revenue >= 100000) return 'P1';
  if (health === 'degraded' || revenue >= 40000) return 'P2';
  if (revenue >= 10000) return 'P3';
  return 'P4';
}

export function availabilityFromHealth(slaTarget: number, healthScore: number): number {
  return Number(Math.min(99.99, Math.max(95, slaTarget - (100 - healthScore) * 0.08)).toFixed(2));
}

export function recoveryOrderFromNodes(
  nodes: Array<{ name: string; ciType: string }>,
  serviceName: string,
): string[] {
  return [
    ...nodes.filter((n) => /database|storage/i.test(n.ciType)).map((n) => n.name),
    ...nodes.filter((n) => /api|gateway|application/i.test(n.ciType)).map((n) => n.name),
    ...nodes.filter((n) => /kubernetes|cloud|server|host/i.test(n.ciType)).map((n) => n.name),
    serviceName,
  ]
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 12);
}

export const VENDOR_LEAK_RE =
  /skywalking|grafana|prometheus ui|elastic(?:search)?|datadog|new relic|dynatrace|splunk|otlp/i;
