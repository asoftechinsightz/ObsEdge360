/** Standard audit event (see docs/phase2/AUDIT_EVENT_SCHEMA.md). */
export interface AuditEvent {
  timestamp?: string;
  tenantId: string;
  userId?: string;
  service?: string;
  resource?: string;
  resourceId?: string;
  action: string;
  decision?: 'allow' | 'deny';
  policy?: string;
  reason?: string;
  ip?: string;
  userAgent?: string;
  traceId?: string;
  correlationId?: string;
  riskScore?: number;
  metadata?: Record<string, unknown>;
}

export function toAuditLogRow(event: AuditEvent) {
  return {
    tenantId: event.tenantId,
    actorId: event.userId,
    actorType: 'user',
    action: event.action,
    resourceType: event.resource,
    resourceId: event.resourceId,
    correlationId: event.correlationId,
    ipAddress: event.ip,
    metadata: {
      service: event.service ?? 'api-gateway',
      decision: event.decision,
      policy: event.policy,
      reason: event.reason,
      userAgent: event.userAgent,
      traceId: event.traceId,
      riskScore: event.riskScore,
      ...(event.metadata ?? {}),
    },
  };
}
