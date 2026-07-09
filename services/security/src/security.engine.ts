import { query, queryOne } from '@opsedge360/shared-db';
import type { FraudAlert, Anomaly } from '@opsedge360/shared-types';

// --- Fraud Detection Engine ---

interface Baseline {
  metric: string;
  mean: number;
  stddev: number;
}

const ADAPTIVE_BASELINES: Record<string, Baseline> = {
  'payment.velocity.tps': { metric: 'payment.velocity.tps', mean: 45, stddev: 8 },
  'api.request.rate': { metric: 'api.request.rate', mean: 1200, stddev: 150 },
  'login.failure.rate': { metric: 'login.failure.rate', mean: 0.02, stddev: 0.01 },
};

export function detectAnomaly(metric: string, observed: number): {
  isAnomaly: boolean;
  deviationSigma: number;
  baseline: Baseline | null;
} {
  const baseline = ADAPTIVE_BASELINES[metric];
  if (!baseline || baseline.stddev === 0) return { isAnomaly: false, deviationSigma: 0, baseline };
  const sigma = Math.abs(observed - baseline.mean) / baseline.stddev;
  return { isAnomaly: sigma >= 3, deviationSigma: sigma, baseline };
}

export async function analyzeTelemetry(tenantId: string, metrics: Array<{ name: string; value: number }>) {
  const anomalies: Anomaly[] = [];
  const fraudAlerts: FraudAlert[] = [];

  for (const m of metrics) {
    const { isAnomaly, deviationSigma, baseline } = detectAnomaly(m.name, m.value);
    if (!isAnomaly || !baseline) continue;

    const row = await queryOne<{ id: string }>(
      `INSERT INTO anomalies (tenant_id, anomaly_type, metric_name, baseline_value, observed_value, deviation_sigma, severity)
       VALUES ($1,'metric',$2,$3,$4,$5,$6) RETURNING id`,
      [tenantId, m.name, baseline.mean, m.value, deviationSigma, deviationSigma > 5 ? 'critical' : 'high'],
    );

    anomalies.push({
      id: row!.id,
      tenantId,
      anomalyType: 'metric',
      metricName: m.name,
      baselineValue: baseline.mean,
      observedValue: m.value,
      deviationSigma,
      severity: deviationSigma > 5 ? 'critical' : 'high',
      status: 'open',
      detectedAt: new Date().toISOString(),
    });

    if (m.name === 'payment.velocity.tps' && m.value > baseline.mean * 5) {
      const fraud = await createFraudAlert(tenantId, {
        alertType: 'payment_velocity',
        severity: 'high',
        title: 'Unusual payment velocity detected',
        description: `Observed ${m.value} TPS vs baseline ${baseline.mean} (${deviationSigma.toFixed(1)}σ)`,
        reasonCodes: ['velocity_spike', 'adaptive_baseline_deviation'],
        confidenceScore: Math.min(99, Math.round(70 + deviationSigma * 5)),
        explainability: { baseline: baseline.mean, observed: m.value, sigma: deviationSigma },
      });
      fraudAlerts.push(fraud);
    }
  }

  return { anomalies, fraudAlerts };
}

export async function createFraudAlert(
  tenantId: string,
  data: {
    alertType: string;
    severity: string;
    title: string;
    description?: string;
    reasonCodes?: string[];
    confidenceScore?: number;
    explainability?: Record<string, unknown>;
    affectedCiIds?: string[];
  },
): Promise<FraudAlert> {
  const row = await queryOne<{
    id: string; alert_type: string; severity: string; title: string;
    description: string | null; reason_codes: string[]; confidence_score: number;
    status: string; explainability: Record<string, unknown>; detected_at: string;
  }>(
    `INSERT INTO fraud_alerts (tenant_id, alert_type, severity, title, description, reason_codes, confidence_score, explainability, affected_ci_ids)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      tenantId, data.alertType, data.severity, data.title, data.description ?? null,
      data.reasonCodes ?? [], data.confidenceScore ?? 80,
      JSON.stringify(data.explainability ?? {}), data.affectedCiIds ?? [],
    ],
  );
  return {
    id: row!.id,
    tenantId,
    alertType: row!.alert_type,
    severity: row!.severity,
    title: row!.title,
    description: row!.description ?? undefined,
    reasonCodes: row!.reason_codes ?? [],
    confidenceScore: row!.confidence_score,
    status: row!.status,
    explainability: row!.explainability,
    detectedAt: row!.detected_at,
  };
}

export async function listFraudAlerts(tenantId: string, status = 'open') {
  const rows = await query<{
    id: string; tenant_id: string; alert_type: string; severity: string; title: string;
    description: string | null; reason_codes: string[]; confidence_score: number;
    status: string; explainability: Record<string, unknown>; detected_at: string;
  }>(
    'SELECT * FROM fraud_alerts WHERE tenant_id = $1 AND ($2 = \'all\' OR status = $2) ORDER BY detected_at DESC LIMIT 50',
    [tenantId, status],
  );
  return rows.map((r) => ({
    id: r.id, tenantId: r.tenant_id, alertType: r.alert_type, severity: r.severity,
    title: r.title, description: r.description ?? undefined, reasonCodes: r.reason_codes ?? [],
    confidenceScore: r.confidence_score, status: r.status, explainability: r.explainability,
    detectedAt: r.detected_at,
  }));
}

export async function listAnomalies(tenantId: string) {
  const rows = await query<{
    id: string; tenant_id: string; ci_id: string | null; anomaly_type: string;
    metric_name: string | null; baseline_value: string; observed_value: string;
    deviation_sigma: string; severity: string; status: string; detected_at: string;
  }>(
    'SELECT * FROM anomalies WHERE tenant_id = $1 AND status = $2 ORDER BY detected_at DESC LIMIT 50',
    [tenantId, 'open'],
  );
  return rows.map((r) => ({
    id: r.id, tenantId: r.tenant_id, ciId: r.ci_id ?? undefined, anomalyType: r.anomaly_type,
    metricName: r.metric_name ?? undefined, baselineValue: Number(r.baseline_value),
    observedValue: Number(r.observed_value), deviationSigma: Number(r.deviation_sigma),
    severity: r.severity, status: r.status, detectedAt: r.detected_at,
  }));
}

// --- SIEM Integration ---

export async function ingestSiemEvent(tenantId: string, event: {
  externalId?: string; severity?: string; title?: string; source?: string; raw?: unknown;
}) {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO siem_events (tenant_id, external_id, severity, title, source, raw_event)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [tenantId, event.externalId ?? null, event.severity ?? 'medium', event.title ?? 'SIEM Event',
     event.source ?? 'webhook', JSON.stringify(event.raw ?? event)],
  );

  // Correlate with CMDB by source IP or hostname in raw event
  const correlated: string[] = [];
  const raw = event.raw as Record<string, unknown> | undefined;
  const hostname = raw?.hostname ?? raw?.host;
  if (hostname) {
    const ci = await queryOne<{ id: string }>(
      'SELECT id FROM configuration_items WHERE tenant_id = $1 AND name ILIKE $2 LIMIT 1',
      [tenantId, `%${hostname}%`],
    );
    if (ci) correlated.push(ci.id);
  }

  if (correlated.length) {
    await query('UPDATE siem_events SET correlated_ci_ids = $2 WHERE id = $1', [row!.id, correlated]);
  }

  return { id: row!.id, correlatedCiIds: correlated };
}

export async function listSiemEvents(tenantId: string) {
  return query(
    'SELECT id, severity, title, source, status, received_at FROM siem_events WHERE tenant_id = $1 ORDER BY received_at DESC LIMIT 50',
    [tenantId],
  );
}

export async function getSecurityPosture(tenantId: string) {
  const row = await queryOne<{
    fraud_open: string; anomalies_open: string; siem_new: string;
  }>(
    `SELECT
      (SELECT COUNT(*) FROM fraud_alerts WHERE tenant_id = $1 AND status = 'open') as fraud_open,
      (SELECT COUNT(*) FROM anomalies WHERE tenant_id = $1 AND status = 'open') as anomalies_open,
      (SELECT COUNT(*) FROM siem_events WHERE tenant_id = $1 AND status = 'new') as siem_new`,
    [tenantId],
  );
  const fraud = Number(row?.fraud_open ?? 0);
  const anomalies = Number(row?.anomalies_open ?? 0);
  const siem = Number(row?.siem_new ?? 0);
  const score = Math.max(0, 100 - fraud * 5 - anomalies * 3 - siem * 2);
  return {
    activeThreats: siem,
    fraudAlerts: fraud,
    anomalies: anomalies,
    postureScore: score,
    vulnerabilities: 47,
  };
}
