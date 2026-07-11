import { createHash, randomUUID } from 'crypto';

/** Audit schema version — evolve deliberately; bump with SDS. */
export const AUDIT_SCHEMA_VERSION = '1.1';

export type AuditActorType = 'user' | 'system' | 'api_key' | 'service';
export type AuditOutcome = 'success' | 'failure' | 'allow' | 'deny' | 'n/a';
export type AuditSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type AuditEventCategory =
  | 'identity_authentication'
  | 'authorization'
  | 'configuration_changes'
  | 'infrastructure_lifecycle'
  | 'secrets_key_management'
  | 'api_access'
  | 'data_access'
  | 'data_export'
  | 'administrative_actions'
  | 'deployment_release'
  | 'policy_changes'
  | 'backup_restore'
  | 'tenant_administration'
  | 'integration_events'
  | 'ai_automation_decisions';

/** Schema v1.1 — EAB mandatory fields. */
export interface AuditEventV11 {
  eventId?: string;
  tenantId: string;
  organizationId?: string;
  timestamp?: string;
  eventCategory: AuditEventCategory;
  eventType: string;
  actor?: string;
  actorType?: AuditActorType;
  resourceType?: string;
  resourceId?: string;
  action: string;
  outcome?: AuditOutcome;
  severity?: AuditSeverity;
  sourceService?: string;
  environment?: string;
  correlationId?: string;
  traceId?: string;
  sessionId?: string;
  clientIp?: string;
  userAgent?: string;
  beforeHash?: string | null;
  afterHash?: string | null;
  metadata?: Record<string, unknown>;
  signature?: string | null;
  schemaVersion?: string;
  /** @deprecated map into outcome/metadata — Wave 2 compat */
  userId?: string;
  decision?: 'allow' | 'deny';
  reason?: string;
  riskScore?: number;
  policy?: string;
  permission?: string;
  service?: string;
  ip?: string;
  resource?: string;
}

/** @deprecated Use AuditEventV11 */
export type AuditEvent = AuditEventV11;

const L2_CATEGORIES = new Set<AuditEventCategory>([
  'identity_authentication',
  'authorization',
  'administrative_actions',
  'policy_changes',
  'data_export',
  'secrets_key_management',
  'tenant_administration',
]);

export function shouldEnqueueEvidence(category: AuditEventCategory, outcome?: AuditOutcome): boolean {
  if (process.env.AUDIT_L2_QUEUE === 'false') return false;
  if (category === 'authorization' && outcome === 'allow') {
    const rate = Number(process.env.AUDIT_ALLOW_SAMPLE_RATE ?? 0);
    if (rate <= 0) return false;
    return Math.random() < rate;
  }
  return L2_CATEGORIES.has(category);
}

export function normalizeAuditEvent(input: AuditEventV11): Required<
  Pick<
    AuditEventV11,
    | 'eventId'
    | 'tenantId'
    | 'organizationId'
    | 'timestamp'
    | 'eventCategory'
    | 'eventType'
    | 'action'
    | 'outcome'
    | 'severity'
    | 'sourceService'
    | 'environment'
    | 'schemaVersion'
    | 'actorType'
  >
> &
  AuditEventV11 {
  const eventId = input.eventId ?? randomUUID();
  const outcome =
    input.outcome ??
    (input.decision === 'allow' ? 'allow' : input.decision === 'deny' ? 'deny' : 'n/a');
  return {
    ...input,
    eventId,
    tenantId: input.tenantId,
    organizationId: input.organizationId ?? input.tenantId,
    timestamp: input.timestamp ?? new Date().toISOString(),
    eventCategory: input.eventCategory,
    eventType: input.eventType,
    actor: input.actor ?? input.userId,
    actorType: input.actorType ?? 'user',
    resourceType: input.resourceType ?? input.resource,
    resourceId: input.resourceId,
    action: input.action,
    outcome,
    severity: input.severity ?? (outcome === 'deny' || outcome === 'failure' ? 'high' : 'info'),
    sourceService: input.sourceService ?? input.service ?? 'api-gateway',
    environment: input.environment ?? process.env.NODE_ENV ?? 'development',
    correlationId: input.correlationId,
    traceId: input.traceId,
    sessionId: input.sessionId,
    clientIp: input.clientIp ?? input.ip,
    userAgent: input.userAgent,
    beforeHash: input.beforeHash ?? null,
    afterHash: input.afterHash ?? null,
    metadata: {
      ...(input.metadata ?? {}),
      ...(input.reason ? { reason: input.reason } : {}),
      ...(input.policy ? { policy: input.policy } : {}),
      ...(input.permission ? { permission: input.permission } : {}),
      ...(input.riskScore != null ? { riskScore: input.riskScore } : {}),
    },
    signature: input.signature ?? null,
    schemaVersion: input.schemaVersion ?? AUDIT_SCHEMA_VERSION,
  };
}

/** Canonical JSON for hashing — stable key order. */
export function canonicalAuditPayload(event: AuditEventV11): string {
  const n = normalizeAuditEvent(event);
  const ordered: Record<string, unknown> = {
    eventId: n.eventId,
    tenantId: n.tenantId,
    organizationId: n.organizationId,
    timestamp: n.timestamp,
    eventCategory: n.eventCategory,
    eventType: n.eventType,
    actor: n.actor ?? null,
    actorType: n.actorType,
    resourceType: n.resourceType ?? null,
    resourceId: n.resourceId ?? null,
    action: n.action,
    outcome: n.outcome,
    severity: n.severity,
    sourceService: n.sourceService,
    environment: n.environment,
    correlationId: n.correlationId ?? null,
    traceId: n.traceId ?? null,
    sessionId: n.sessionId ?? null,
    clientIp: n.clientIp ?? null,
    userAgent: n.userAgent ?? null,
    beforeHash: n.beforeHash ?? null,
    afterHash: n.afterHash ?? null,
    metadata: n.metadata ?? {},
    schemaVersion: n.schemaVersion,
  };
  return JSON.stringify(ordered);
}

export function contentHash(event: AuditEventV11): string {
  return createHash('sha256').update(canonicalAuditPayload(event)).digest('hex');
}

export function verifyContentHash(event: AuditEventV11, expectedHash: string): boolean {
  return contentHash(event) === expectedHash;
}

export function toAuditLogRow(event: AuditEventV11) {
  const n = normalizeAuditEvent(event);
  const actorUuid =
    n.actor && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(n.actor)
      ? n.actor
      : undefined;
  return {
    eventId: n.eventId!,
    tenantId: n.tenantId,
    actorId: actorUuid,
    actorType: n.actorType ?? 'user',
    action: n.action,
    resourceType: n.resourceType,
    resourceId: n.resourceId,
    correlationId: n.correlationId,
    ipAddress: n.clientIp,
    schemaVersion: n.schemaVersion,
    metadata: {
      schemaVersion: n.schemaVersion,
      eventCategory: n.eventCategory,
      eventType: n.eventType,
      organizationId: n.organizationId,
      outcome: n.outcome,
      severity: n.severity,
      sourceService: n.sourceService,
      environment: n.environment,
      userAgent: n.userAgent,
      traceId: n.traceId,
      sessionId: n.sessionId,
      beforeHash: n.beforeHash,
      afterHash: n.afterHash,
      signature: n.signature,
      actor: n.actor,
      ...(n.metadata ?? {}),
    },
  };
}

export function redactAuditMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const out = { ...meta };
  for (const key of Object.keys(out)) {
    const lower = key.toLowerCase();
    if (
      lower.includes('password') ||
      lower.includes('secret') ||
      lower.includes('token') ||
      lower.includes('authorization') ||
      lower.includes('apikey') ||
      lower.includes('api_key')
    ) {
      out[key] = '[REDACTED]';
    }
  }
  return out;
}
