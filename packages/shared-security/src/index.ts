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
    tenantId: input.tenantSlug,
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
