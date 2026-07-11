import { Pool, type QueryResultRow } from 'pg';

let pool: Pool | null = null;

function poolSettings() {
  try {
    const { getPlatformConfig } = require('@opsedge360/platform-config') as typeof import('@opsedge360/platform-config');
    const cfg = getPlatformConfig();
    return { max: cfg.dbPoolMax, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000, statement_timeout: 30_000 };
  } catch {
    return { max: Number(process.env.DB_POOL_MAX ?? 20), idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 };
  }
}

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.POSTGRES_HOST ?? 'localhost',
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      user: process.env.POSTGRES_USER ?? 'trinetra',
      password: process.env.POSTGRES_PASSWORD ?? 'trinetra_dev',
      database: process.env.POSTGRES_DB ?? 'trinetra360',
      ...poolSettings(),
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
}

/**
 * Legacy resolver: unknown keys fall back to slug `default`.
 * Prefer resolveTenantStrict for security-sensitive paths (Wave 2).
 */
export async function resolveTenantId(slugOrId?: string): Promise<string> {
  const key = slugOrId ?? process.env.TENANT_ID ?? 'default';

  const bySlug = await queryOne<TenantRow>(
    'SELECT id, name, slug FROM tenants WHERE slug = $1 OR id::text = $1 LIMIT 1',
    [key],
  );
  if (bySlug) return bySlug.id;

  if (process.env.TENANT_STRICT === 'true') {
    throw new Error(`Unknown tenant: ${key}`);
  }

  const fallback = await queryOne<TenantRow>(
    "SELECT id, name, slug FROM tenants WHERE slug = 'default' LIMIT 1",
  );
  if (!fallback) throw new Error('No tenant found. Run database migrations and seeds.');
  return fallback.id;
}

/** Fail closed: no silent fallback to default when a key is provided. */
export async function resolveTenantStrict(slugOrId: string): Promise<TenantRow> {
  const key = slugOrId.trim();
  if (!key) throw new Error('Tenant key required');
  const row = await queryOne<TenantRow>(
    'SELECT id, name, slug FROM tenants WHERE slug = $1 OR id::text = $1 LIMIT 1',
    [key],
  );
  if (!row) throw new Error(`Unknown tenant: ${key}`);
  return row;
}

export async function getTenantById(id: string): Promise<TenantRow | null> {
  return queryOne<TenantRow>('SELECT id, name, slug FROM tenants WHERE id = $1 LIMIT 1', [id]);
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export { mountOpsEndpoints } from './ops-endpoints';
export type { OpsEndpointOptions } from './ops-endpoints';
