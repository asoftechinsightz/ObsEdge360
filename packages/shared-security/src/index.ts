import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { query, queryOne } from '@opsedge360/shared-db';
import { createLogger } from '@opsedge360/shared-logger';
import {
  toAuditLogRow,
  normalizeAuditEvent,
  redactAuditMetadata,
  shouldEnqueueEvidence,
  contentHash,
  type AuditEvent,
} from './audit-event';
import { incSecurityMetric } from './metrics';

export * from './permissions';
export * from './metrics';
export * from './audit-event';
export * from './secrets-provider';
export * from './secrets-crypto';
export * from './service-jwt';
export * from './security-observability';

const log = createLogger('shared-security');

export interface RoleRow {
  id: string;
  tenant_id: string;
  name: string;
  permissions: string[];
}

export interface AbacPolicyRow {
  id: string;
  effect: 'allow' | 'deny';
  resource_pattern: string;
  action_pattern: string;
  conditions: Record<string, unknown>;
  priority: number;
  enabled: boolean;
}

export interface AuthContext {
  userId?: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  apiKeyScopes?: string[];
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function generateApiKey(): { key: string; prefix: string } {
  const raw = randomBytes(32).toString('base64url');
  const key = `oe360_${raw}`;
  return { key, prefix: key.slice(0, 12) };
}

export function verifyApiKey(provided: string, hash: string): boolean {
  const computed = hashApiKey(provided);
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
  } catch {
    return false;
  }
}

export function matchPermission(granted: string, required: string): boolean {
  if (granted === '*') return true;
  if (granted === required) return true;
  const [gResource, gAction] = granted.split(':');
  const [rResource, rAction] = required.split(':');
  if (gResource === '*' || gResource === rResource) {
    return gAction === '*' || gAction === rAction;
  }
  return false;
}

export function hasPermission(ctx: AuthContext, permission: string): boolean {
  const all = [...ctx.permissions, ...(ctx.apiKeyScopes ?? [])];
  return all.some((p) => matchPermission(p, permission));
}

/** Map legacy users.role string to permission grants (catalog — not scattered in controllers). */
export const LEGACY_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],
  operator: [
    'discovery:*',
    'cmdb:*',
    'observability:*',
    'transactions:*',
    'compliance:read',
    'security:read',
    'agents:*',
    'remediation:*',
    'network:read',
    'analytics:read',
    'platform:read',
  ],
  viewer: ['*:read'],
};

export function permissionsForLegacyRole(role: string): string[] {
  return LEGACY_ROLE_PERMISSIONS[role] ?? LEGACY_ROLE_PERMISSIONS.viewer;
}

export function mergePermissions(...lists: string[][]): string[] {
  const set = new Set<string>();
  for (const list of lists) {
    for (const p of list) set.add(p);
  }
  return [...set];
}

/**
 * Infer required permission from HTTP method + path (central policy — services must not reimplement).
 * Examples: GET /api/v1/cmdb/cis → cmdb:read ; POST /api/v1/discovery/scan → discovery:write
 */
export function inferPermission(method: string, path: string): string {
  const normalized = path.replace(/^\/api\/v1\/?/, '').replace(/^\//, '');
  const segment = normalized.split('/').filter(Boolean)[0] ?? 'platform';
  const resource = segment === 'auth' ? 'platform' : segment;
  const m = method.toUpperCase();
  const action =
    m === 'GET' || m === 'HEAD' || m === 'OPTIONS'
      ? 'read'
      : m === 'DELETE'
        ? 'delete'
        : 'write';
  return `${resource}:${action}`;
}

export function authorize(
  ctx: AuthContext,
  permission: string,
  policies: AbacPolicyRow[] = [],
  attributes: Record<string, unknown> = {},
): { allowed: boolean; reason: string } {
  if (!hasPermission(ctx, permission)) {
    return { allowed: false, reason: 'rbac_deny' };
  }
  if (policies.length === 0) {
    return { allowed: true, reason: 'rbac_allow' };
  }
  const [resource, action] = permission.split(':');
  const abacOk = evaluateAbac(policies, resource ?? permission, action ?? '*', {
    tenantId: ctx.tenantId,
    ...attributes,
  });
  // If no policy matched, evaluateAbac returns false — treat as allow when RBAC passed and no matching policy
  const anyMatch = policies.some((p) => {
    const resourceMatch = new RegExp(`^${p.resource_pattern.replace(/\*/g, '.*')}$`).test(resource ?? '');
    const actionMatch = new RegExp(`^${p.action_pattern.replace(/\*/g, '.*')}$`).test(action ?? '');
    return resourceMatch && actionMatch;
  });
  if (!anyMatch) {
    return { allowed: true, reason: 'rbac_allow_no_abac_match' };
  }
  if (!abacOk) {
    return { allowed: false, reason: 'abac_deny' };
  }
  return { allowed: true, reason: 'rbac_abac_allow' };
}

export async function buildAuthContext(input: {
  userId: string;
  tenantSlug: string;
  /** Canonical tenant UUID when resolved (Wave 2). */
  tenantId?: string;
  legacyRole?: string;
}): Promise<AuthContext> {
  let roles: RoleRow[] = [];
  try {
    roles = await loadUserRoles(input.userId);
  } catch {
    roles = [];
  }
  const roleNames = roles.map((r) => r.name);
  const dbPerms = roles.flatMap((r) => (Array.isArray(r.permissions) ? r.permissions : []));
  const legacyPerms = permissionsForLegacyRole(input.legacyRole ?? 'viewer');
  const permissions = dbPerms.length > 0 ? dbPerms : legacyPerms;
  return {
    userId: input.userId,
    tenantId: input.tenantId ?? input.tenantSlug,
    roles: roleNames.length ? roleNames : [input.legacyRole ?? 'viewer'],
    permissions,
  };
}


export async function loadUserRoles(userId: string): Promise<RoleRow[]> {
  const rows = await query<RoleRow & { permissions: string[] | string }>(
    `SELECT r.id, r.tenant_id, r.name, r.permissions FROM roles r
     JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = $1`,
    [userId],
  );
  return rows.map((r) => ({
    ...r,
    permissions: Array.isArray(r.permissions)
      ? r.permissions
      : typeof r.permissions === 'string'
        ? (JSON.parse(r.permissions) as string[])
        : [],
  }));
}

export async function loadTenantPolicies(tenantId: string): Promise<AbacPolicyRow[]> {
  return query<AbacPolicyRow>(
    `SELECT id, effect, resource_pattern, action_pattern, conditions, priority, enabled
     FROM abac_policies
     WHERE tenant_id = $1 AND enabled = true
     ORDER BY priority ASC`,
    [tenantId],
  );
}

export function evaluateAbac(
  policies: AbacPolicyRow[],
  resource: string,
  action: string,
  attributes: Record<string, unknown>,
): boolean {
  let allowed = false;
  for (const policy of policies) {
    const resourceMatch = new RegExp(`^${policy.resource_pattern.replace(/\*/g, '.*')}$`).test(resource);
    const actionMatch = new RegExp(`^${policy.action_pattern.replace(/\*/g, '.*')}$`).test(action);
    if (!resourceMatch || !actionMatch) continue;

    const conditions = policy.conditions ?? {};
    const conditionsMet = Object.entries(conditions).every(([key, expected]) => attributes[key] === expected);
    if (!conditionsMet) continue;

    if (policy.effect === 'deny') return false;
    allowed = true;
  }
  return allowed;
}

export async function validateApiKey(tenantId: string, key: string): Promise<{ id: string; scopes: string[] } | null> {
  const prefix = key.slice(0, 12);
  const row = await queryOne<{ id: string; key_hash: string; scopes: string[] }>(
    `SELECT id, key_hash, scopes FROM api_keys
     WHERE tenant_id = $1 AND key_prefix = $2 AND revoked_at IS NULL
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [tenantId, prefix],
  );
  if (!row || !verifyApiKey(key, row.key_hash)) return null;
  await query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [row.id]);
  return { id: row.id, scopes: row.scopes };
}

export class TokenBucketRateLimiter {
  private readonly buckets = new Map<string, { tokens: number; lastRefill: number }>();

  constructor(
    private readonly capacity: number,
    private readonly refillPerSec: number,
  ) {}

  consume(key: string, tokens = 1): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, lastRefill: now };
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsed * this.refillPerSec);
    bucket.lastRefill = now;

    if (bucket.tokens < tokens) {
      this.buckets.set(key, bucket);
      return false;
    }
    bucket.tokens -= tokens;
    this.buckets.set(key, bucket);
    return true;
  }
}

export async function writeAuditLog(entry: {
  tenantId: string;
  actorId?: string;
  actorType?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  correlationId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
  eventId?: string;
  schemaVersion?: string;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_logs
        (tenant_id, actor_id, actor_type, action, resource_type, resource_id, correlation_id, ip_address, metadata, event_id, schema_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        entry.tenantId,
        entry.actorId ?? null,
        entry.actorType ?? 'user',
        entry.action,
        entry.resourceType ?? null,
        entry.resourceId ?? null,
        entry.correlationId ?? null,
        entry.ipAddress ?? null,
        JSON.stringify(entry.metadata ?? {}),
        entry.eventId ?? null,
        entry.schemaVersion ?? '1.1',
      ],
    );
    incSecurityMetric('security.audit.l1_success');
    log.info('Audit event recorded', { action: entry.action, resourceType: entry.resourceType });
  } catch (err) {
    // Fallback if migration 017 columns not yet applied
    try {
      await query(
        `INSERT INTO audit_logs
          (tenant_id, actor_id, actor_type, action, resource_type, resource_id, correlation_id, ip_address, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          entry.tenantId,
          entry.actorId ?? null,
          entry.actorType ?? 'user',
          entry.action,
          entry.resourceType ?? null,
          entry.resourceId ?? null,
          entry.correlationId ?? null,
          entry.ipAddress ?? null,
          JSON.stringify(entry.metadata ?? {}),
        ],
      );
      incSecurityMetric('security.audit.l1_success');
    } catch (err2) {
      incSecurityMetric('security.audit.write_fail');
      throw err2;
    }
  }
}

/**
 * Wave 3 emit pipeline: L1 sync + durable outbox enqueue for L2 (async writer).
 * Never writes L2 synchronously on the request path.
 */
export async function emitAudit(event: AuditEvent): Promise<{ eventId: string; queued: boolean }> {
  if (process.env.AUDIT_EMIT === 'false') {
    return { eventId: event.eventId ?? 'suppressed', queued: false };
  }
  const normalized = normalizeAuditEvent({
    ...event,
    metadata: redactAuditMetadata(event.metadata ?? {}),
  });
  const row = toAuditLogRow(normalized);
  const failClosed = process.env.AUDIT_FAIL_CLOSED === 'true';
  try {
    await writeAuditLog(row);
  } catch (err) {
    if (failClosed) throw err;
    log.warn('L1 audit write failed (fail-open)', { err: (err as Error).message });
  }

  let queued = false;
  if (shouldEnqueueEvidence(normalized.eventCategory, normalized.outcome)) {
    try {
      await query(
        `INSERT INTO audit_evidence_outbox (event_id, tenant_id, payload)
         VALUES ($1, $2, $3)
         ON CONFLICT (event_id) DO NOTHING`,
        [normalized.eventId, normalized.tenantId, JSON.stringify(normalized)],
      );
      incSecurityMetric('security.audit.queue_enqueued');
      queued = true;
    } catch (err) {
      incSecurityMetric('security.audit.write_fail');
      log.warn('Audit outbox enqueue failed', { err: (err as Error).message });
      if (failClosed) throw err;
    }
  }
  return { eventId: normalized.eventId!, queued };
}

export async function writeStandardAudit(event: AuditEvent): Promise<void> {
  await emitAudit(event);
}

export async function processAuditOutboxBatch(limit = 50): Promise<number> {
  const rows = await query<{ id: string; event_id: string; tenant_id: string; payload: AuditEvent | string }>(
    `WITH cte AS (
       SELECT id FROM audit_evidence_outbox
       WHERE processed_at IS NULL AND available_at <= NOW()
       ORDER BY created_at ASC
       LIMIT $1
     )
     UPDATE audit_evidence_outbox o
     SET available_at = NOW() + INTERVAL '2 minutes', attempts = o.attempts + 1
     FROM cte WHERE o.id = cte.id
     RETURNING o.id, o.event_id, o.tenant_id, o.payload`,
    [limit],
  );
  let written = 0;
  for (const row of rows) {
    const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
    const normalized = normalizeAuditEvent(payload);
    const hash = contentHash(normalized);
    try {
      await query(
        `INSERT INTO audit_evidence
          (event_id, tenant_id, organization_id, event_category, event_type, payload, content_hash, schema_version)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (event_id) DO NOTHING`,
        [
          normalized.eventId,
          normalized.tenantId,
          normalized.organizationId ?? normalized.tenantId,
          normalized.eventCategory,
          normalized.eventType,
          JSON.stringify(normalized),
          hash,
          normalized.schemaVersion ?? '1.1',
        ],
      );
      await query(`UPDATE audit_evidence_outbox SET processed_at = NOW(), last_error = NULL WHERE id = $1`, [
        row.id,
      ]);
      incSecurityMetric('security.audit.l2_written');
      written += 1;
    } catch (err) {
      await query(
        `UPDATE audit_evidence_outbox
         SET available_at = NOW() + INTERVAL '30 seconds', last_error = $2
         WHERE id = $1`,
        [row.id, (err as Error).message],
      );
    }
  }
  return written;
}

export async function getAuditOutboxDepth(): Promise<number> {
  const row = await queryOne<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM audit_evidence_outbox WHERE processed_at IS NULL`,
  );
  const depth = Number(row?.c ?? 0);
  // store latest depth as gauge-like counter set
  return depth;
}

export async function verifyEvidenceHash(evidenceId: string, tenantId: string): Promise<{
  ok: boolean;
  eventId?: string;
  expected?: string;
  actual?: string;
}> {
  const row = await queryOne<{ event_id: string; payload: AuditEvent; content_hash: string }>(
    `SELECT event_id, payload, content_hash FROM audit_evidence WHERE id = $1 AND tenant_id = $2`,
    [evidenceId, tenantId],
  );
  if (!row) return { ok: false };
  const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
  const actual = contentHash(payload);
  const ok = actual === row.content_hash;
  if (!ok) incSecurityMetric('security.audit.verify_fail');
  return { ok, eventId: row.event_id, expected: row.content_hash, actual };
}
