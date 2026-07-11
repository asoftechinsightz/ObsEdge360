/** In-process security metrics (Wave 1/2). Wave 5 exports to Prometheus/dashboards. */
export type SecurityMetricName =
  | 'security.auth.success'
  | 'security.auth.denied'
  | 'security.auth.invalid_token'
  | 'security.auth.expired_token'
  | 'security.auth.cross_tenant_attempt'
  | 'security.auth.refresh_success'
  | 'security.auth.refresh_failure'
  | 'security.audit.write_fail';

const counters = new Map<SecurityMetricName, number>();

export function incSecurityMetric(name: SecurityMetricName, by = 1): void {
  counters.set(name, (counters.get(name) ?? 0) + by);
}

export function getSecurityMetrics(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of counters.entries()) out[k] = v;
  return out;
}

export function resetSecurityMetrics(): void {
  counters.clear();
}

export function securityMetricsPrometheus(): string {
  const lines: string[] = ['# HELP opsedge360_security_auth Authorization and auth metrics', '# TYPE opsedge360_security_auth counter'];
  for (const [name, value] of counters.entries()) {
    const metric = name.replace(/\./g, '_');
    lines.push(`${metric} ${value}`);
  }
  return lines.join('\n') + '\n';
}
