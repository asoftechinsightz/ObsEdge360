import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { query, queryOne } from '@opsedge360/shared-db';
import { createLogger } from '@opsedge360/shared-logger';

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

export async function loadUserRoles(userId: string): Promise<RoleRow[]> {
  return query<RoleRow>(
    `SELECT r.* FROM roles r
     JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = $1`,
    [userId],
  );
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
}): Promise<void> {
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
  log.info('Audit event recorded', { action: entry.action, resourceType: entry.resourceType });
}
