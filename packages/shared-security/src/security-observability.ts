import { query, queryOne } from '@opsedge360/shared-db';
import { getSecurityMetrics, incSecurityMetric } from './metrics';

export interface SecurityEventInput {
  tenantId: string;
  eventType: string;
  category?: string;
  severity?: string;
  sourceService?: string;
  actorId?: string;
  resourceType?: string;
  resourceId?: string;
  correlationId?: string;
  traceId?: string;
  riskScore?: number;
  payload?: Record<string, unknown>;
}

export async function ingestSecurityEvent(input: SecurityEventInput): Promise<{ id: string }> {
  if (process.env.SECURITY_OBS_ENABLED === 'false') {
    return { id: 'suppressed' };
  }
  const risk = input.riskScore ?? defaultRisk(input.eventType);
  const row = await queryOne<{ id: string }>(
    `INSERT INTO security_events
      (tenant_id, event_type, category, severity, source_service, actor_id, resource_type, resource_id,
       correlation_id, trace_id, risk_score, payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id`,
    [
      input.tenantId,
      input.eventType,
      input.category ?? 'security',
      input.severity ?? (risk >= 70 ? 'high' : risk >= 40 ? 'medium' : 'info'),
      input.sourceService ?? 'api-gateway',
      input.actorId ?? null,
      input.resourceType ?? null,
      input.resourceId ?? null,
      input.correlationId ?? null,
      input.traceId ?? null,
      risk,
      JSON.stringify(input.payload ?? {}),
    ],
  );
  if (!row) throw new Error('Failed to ingest security event');
  incSecurityMetric('security.obs.event_ingested');
  await evaluateDetections(input.tenantId, input.eventType).catch(() => undefined);
  return row;
}

function defaultRisk(eventType: string): number {
  if (eventType.includes('cross_tenant')) return 85;
  if (eventType.includes('deny') || eventType.includes('revoked')) return 60;
  if (eventType.includes('secret.accessed')) return 35;
  if (eventType.includes('minted')) return 25;
  return 10;
}

export async function evaluateDetections(tenantId: string, eventType: string): Promise<void> {
  const rules = await query<{
    id: string;
    name: string;
    rule_type: string;
    config: { threshold?: number; windowMinutes?: number; eventType?: string } | string;
    severity: string;
  }>(
    `SELECT id, name, rule_type, config, severity FROM security_detection_rules
     WHERE enabled = true AND (tenant_id IS NULL OR tenant_id = $1)`,
    [tenantId],
  );

  for (const rule of rules) {
    const cfg =
      typeof rule.config === 'string' ? (JSON.parse(rule.config) as { threshold?: number; windowMinutes?: number; eventType?: string }) : rule.config;
    const matchType = cfg.eventType ?? rule.rule_type;
    if (matchType !== eventType) continue;

    const threshold = cfg.threshold ?? 10;
    const windowMinutes = cfg.windowMinutes ?? 15;
    const countRow = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM security_events
       WHERE tenant_id = $1 AND event_type = $2
         AND created_at > NOW() - ($3 || ' minutes')::interval`,
      [tenantId, matchType, String(windowMinutes)],
    );
    const count = Number(countRow?.c ?? 0);
    if (count < threshold) continue;

    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM security_alerts
       WHERE tenant_id = $1 AND rule_id = $2 AND status = 'open'
         AND created_at > NOW() - ($3 || ' minutes')::interval
       LIMIT 1`,
      [tenantId, rule.id, String(windowMinutes)],
    );
    if (existing) continue;

    await query(
      `INSERT INTO security_alerts (tenant_id, rule_id, title, severity, status, summary)
       VALUES ($1,$2,$3,$4,'open',$5)`,
      [
        tenantId,
        rule.id,
        `Detection: ${rule.name}`,
        rule.severity,
        `${count} events of type ${matchType} in ${windowMinutes}m (threshold ${threshold})`,
      ],
    );
    incSecurityMetric('security.obs.alert_created');
  }
}

export async function securityDashboard(tenantId: string, hours = 24) {
  const since = `${hours} hours`;
  const rows = await query<{ event_type: string; c: string; avg_risk: string }>(
    `SELECT event_type, COUNT(*)::text AS c, COALESCE(AVG(risk_score),0)::text AS avg_risk
     FROM security_events
     WHERE tenant_id = $1 AND created_at > NOW() - $2::interval
     GROUP BY event_type
     ORDER BY COUNT(*) DESC`,
    [tenantId, since],
  );
  const openAlerts = await queryOne<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM security_alerts WHERE tenant_id = $1 AND status = 'open'`,
    [tenantId],
  );
  const total = rows.reduce((s, r) => s + Number(r.c), 0);
  const weighted = rows.reduce((s, r) => s + Number(r.c) * Number(r.avg_risk), 0);
  const riskScore = total === 0 ? 0 : Math.min(100, Math.round(weighted / total));
  return {
    windowHours: hours,
    totalEvents: total,
    riskScore,
    openAlerts: Number(openAlerts?.c ?? 0),
    byType: rows.map((r) => ({
      eventType: r.event_type,
      count: Number(r.c),
      avgRisk: Math.round(Number(r.avg_risk)),
    })),
    processMetrics: getSecurityMetrics(),
  };
}
