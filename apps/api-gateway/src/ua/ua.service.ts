import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { query, queryOne } from '@opsedge360/shared-db';

export function generateUaAgentKey(): string {
  return `oeua_${randomBytes(32).toString('base64url')}`;
}

export function hashUaAgentKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function verifyUaAgentKey(provided: string, hash: string): boolean {
  const computed = hashUaAgentKey(provided);
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
  } catch {
    return false;
  }
}

export function generateBootstrapToken(): string {
  return `oebt_${randomBytes(24).toString('base64url')}`;
}

export interface UaAgentRow {
  id: string;
  tenant_id: string;
  name: string;
  agent_key_hash: string;
  hostname: string | null;
  platform: string;
  os_version: string | null;
  architecture: string | null;
  version: string | null;
  status: string;
  labels: Record<string, unknown>;
  capabilities: string[];
  metadata: Record<string, unknown>;
  last_heartbeat_at: string | null;
  registered_at: string;
}

function stripKey<T extends { agent_key_hash?: string }>(row: T): Omit<T, 'agent_key_hash'> {
  const { agent_key_hash: _, ...rest } = row;
  return rest;
}

export async function createBootstrapToken(
  tenantId: string,
  opts: { label?: string; ttlHours?: number; maxUses?: number } = {},
) {
  const token = generateBootstrapToken();
  const ttl = opts.ttlHours ?? 24;
  const row = await queryOne(
    `INSERT INTO agent_bootstrap_tokens (tenant_id, token_hash, label, expires_at, max_uses)
     VALUES ($1,$2,$3, NOW() + ($4 || ' hours')::interval, $5)
     RETURNING id, label, expires_at, max_uses, created_at`,
    [tenantId, hashUaAgentKey(token), opts.label ?? 'default', String(ttl), opts.maxUses ?? 10],
  );
  return { token, ...row };
}

export async function enrollWithBootstrapToken(input: {
  bootstrapToken: string;
  name: string;
  hostname?: string;
  platform?: string;
  osVersion?: string;
  architecture?: string;
  version?: string;
  capabilities?: string[];
  labels?: Record<string, unknown>;
  inventory?: Record<string, unknown>;
}) {
  const tokenHash = hashUaAgentKey(input.bootstrapToken);
  const bt = await queryOne<{
    id: string;
    tenant_id: string;
    expires_at: string;
    max_uses: number;
    uses: number;
    revoked_at: string | null;
  }>(
    `SELECT id, tenant_id, expires_at, max_uses, uses, revoked_at
     FROM agent_bootstrap_tokens WHERE token_hash = $1`,
    [tokenHash],
  );
  if (!bt || bt.revoked_at) throw new Error('Invalid bootstrap token');
  if (new Date(bt.expires_at) < new Date()) throw new Error('Bootstrap token expired');
  if (bt.uses >= bt.max_uses) throw new Error('Bootstrap token exhausted');

  const result = await registerUaAgent(bt.tenant_id, {
    name: input.name,
    hostname: input.hostname,
    platform: input.platform,
    osVersion: input.osVersion,
    architecture: input.architecture,
    version: input.version,
    capabilities: input.capabilities,
    labels: input.labels,
  });

  await query(`UPDATE agent_bootstrap_tokens SET uses = uses + 1 WHERE id = $1`, [bt.id]);

  if (input.inventory) {
    await upsertInventory(bt.tenant_id, result.agent.id, input.inventory);
  }

  await recordEvent(bt.tenant_id, result.agent.id, 'agent.enrolled', 'info', 'Agent enrolled via bootstrap token');
  return result;
}

export async function registerUaAgent(
  tenantId: string,
  data: {
    name: string;
    hostname?: string;
    platform?: string;
    osVersion?: string;
    architecture?: string;
    version?: string;
    capabilities?: string[];
    labels?: Record<string, unknown>;
  },
) {
  const agentKey = generateUaAgentKey();
  const row = await queryOne<UaAgentRow>(
    `INSERT INTO agents
      (tenant_id, name, agent_key_hash, hostname, platform, os_version, architecture, version, status, capabilities, labels)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'online',$9,$10)
     RETURNING *`,
    [
      tenantId,
      data.name,
      hashUaAgentKey(agentKey),
      data.hostname ?? null,
      data.platform ?? 'linux',
      data.osVersion ?? null,
      data.architecture ?? null,
      data.version ?? '1.0.0',
      data.capabilities ?? ['metrics', 'logs', 'heartbeat', 'config', 'plugins'],
      JSON.stringify(data.labels ?? {}),
    ],
  );
  if (!row) throw new Error('Failed to register agent');

  await query(
    `INSERT INTO agent_configuration (agent_id, tenant_id, revision, config, checksum)
     VALUES ($1,$2,1,$3,$4)`,
    [
      row.id,
      tenantId,
      JSON.stringify({
        heartbeatIntervalMs: 30000,
        configPollIntervalMs: 60000,
        inventoryIntervalMs: 300000,
        enabledCollectors: ['host.metrics', 'host.logs'],
        otlpEnabled: true,
        sampling: { traces: 0.1 },
        resourceLimits: { maxQueueItems: 5000, maxCpuPct: 25 },
      }),
      createHash('sha256').update('rev1').digest('hex'),
    ],
  );

  await recordEvent(tenantId, row.id, 'agent.registered', 'info', 'Agent registered');
  return { agent: stripKey(row), agentKey };
}

export async function authenticateAgent(agentId: string, agentKey: string): Promise<UaAgentRow | null> {
  const row = await queryOne<UaAgentRow>(`SELECT * FROM agents WHERE id = $1`, [agentId]);
  if (!row || !verifyUaAgentKey(agentKey, row.agent_key_hash)) return null;
  return row;
}

export async function listUaAgents(
  tenantId: string,
  opts: { q?: string; platform?: string; status?: string; limit?: number; offset?: number } = {},
) {
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;
  const params: unknown[] = [tenantId];
  const where = ['tenant_id = $1'];
  if (opts.platform) {
    params.push(opts.platform);
    where.push(`platform = $${params.length}`);
  }
  if (opts.status) {
    params.push(opts.status);
    where.push(`status = $${params.length}`);
  }
  if (opts.q) {
    params.push(`%${opts.q}%`);
    where.push(`(name ILIKE $${params.length} OR hostname ILIKE $${params.length})`);
  }
  params.push(limit, offset);
  const items = await query<UaAgentRow>(
    `SELECT * FROM agents WHERE ${where.join(' AND ')}
     ORDER BY last_heartbeat_at DESC NULLS LAST, name
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  const countRow = await queryOne<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM agents WHERE ${where.join(' AND ')}`,
    params.slice(0, params.length - 2),
  );
  return {
    items: items.map(stripKey),
    total: Number(countRow?.c ?? 0),
    limit,
    offset,
  };
}

export async function getUaAgent(tenantId: string, agentId: string) {
  const row = await queryOne<UaAgentRow>(
    `SELECT * FROM agents WHERE id = $1 AND tenant_id = $2`,
    [agentId, tenantId],
  );
  return row ? stripKey(row) : null;
}

export async function heartbeatUa(
  agent: UaAgentRow,
  data: {
    status?: string;
    version?: string;
    hostname?: string;
    metrics?: Record<string, unknown>;
    health?: {
      healthy?: boolean;
      queueDepth?: number;
      cpuUsage?: number;
      memoryUsage?: number;
      collectorStatus?: Record<string, unknown>;
      details?: Record<string, unknown>;
    };
  },
) {
  await query(
    `UPDATE agents SET last_heartbeat_at = NOW(), status = $2, version = COALESCE($3, version),
       hostname = COALESCE($4, hostname), updated_at = NOW()
     WHERE id = $1`,
    [agent.id, data.status ?? 'online', data.version ?? null, data.hostname ?? null],
  );
  await query(
    `INSERT INTO agent_heartbeat (agent_id, tenant_id, status, version, metrics)
     VALUES ($1,$2,$3,$4,$5)`,
    [
      agent.id,
      agent.tenant_id,
      data.status ?? 'online',
      data.version ?? agent.version,
      JSON.stringify(data.metrics ?? {}),
    ],
  );
  if (data.health) {
    await query(
      `INSERT INTO agent_health (agent_id, tenant_id, healthy, queue_depth, cpu_usage, memory_usage, collector_status, details, reported_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
       ON CONFLICT (agent_id) DO UPDATE SET
         healthy = EXCLUDED.healthy,
         queue_depth = EXCLUDED.queue_depth,
         cpu_usage = EXCLUDED.cpu_usage,
         memory_usage = EXCLUDED.memory_usage,
         collector_status = EXCLUDED.collector_status,
         details = EXCLUDED.details,
         reported_at = NOW()`,
      [
        agent.id,
        agent.tenant_id,
        data.health.healthy !== false,
        data.health.queueDepth ?? 0,
        data.health.cpuUsage ?? null,
        data.health.memoryUsage ?? null,
        JSON.stringify(data.health.collectorStatus ?? {}),
        JSON.stringify(data.health.details ?? {}),
      ],
    );
  }
  // Also feed host_metrics for observability continuity
  if (data.metrics && typeof data.metrics.cpuPct === 'number') {
    await query(
      `INSERT INTO host_metrics
        (tenant_id, hostname, cpu_pct, memory_pct, disk_pct, load_1m, network_in_mbps, network_out_mbps, status, labels)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        agent.tenant_id,
        data.hostname ?? agent.hostname ?? agent.name,
        data.metrics.cpuPct ?? 0,
        data.metrics.memoryPct ?? 0,
        data.metrics.diskPct ?? 0,
        data.metrics.load1m ?? 0,
        data.metrics.networkInMbps ?? 0,
        data.metrics.networkOutMbps ?? 0,
        data.status ?? 'online',
        JSON.stringify({ source: 'universal-agent', agentId: agent.id, platform: agent.platform }),
      ],
    ).catch(() => undefined);
  }
  return { ok: true };
}

export async function upsertInventory(tenantId: string, agentId: string, inv: Record<string, unknown>) {
  const cloud = (inv.cloudMetadata as Record<string, unknown>) ?? {};
  await query(
    `INSERT INTO agent_inventory
      (agent_id, tenant_id, ip_addresses, mac_addresses, cpu, memory, disk, cloud_metadata, region, availability_zone, raw, collected_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
     ON CONFLICT (agent_id) DO UPDATE SET
       ip_addresses = EXCLUDED.ip_addresses,
       mac_addresses = EXCLUDED.mac_addresses,
       cpu = EXCLUDED.cpu,
       memory = EXCLUDED.memory,
       disk = EXCLUDED.disk,
       cloud_metadata = EXCLUDED.cloud_metadata,
       region = EXCLUDED.region,
       availability_zone = EXCLUDED.availability_zone,
       raw = EXCLUDED.raw,
       collected_at = NOW()`,
    [
      agentId,
      tenantId,
      JSON.stringify(inv.ipAddresses ?? []),
      JSON.stringify(inv.macAddresses ?? []),
      JSON.stringify(inv.cpu ?? {}),
      JSON.stringify(inv.memory ?? {}),
      JSON.stringify(inv.disk ?? {}),
      JSON.stringify(cloud),
      (inv.region as string) ?? (cloud.region as string) ?? null,
      (inv.availabilityZone as string) ?? (cloud.availabilityZone as string) ?? null,
      JSON.stringify(inv),
    ],
  );
  await query(
    `UPDATE agents SET
       os_version = COALESCE($2, os_version),
       architecture = COALESCE($3, architecture),
       updated_at = NOW()
     WHERE id = $1`,
    [agentId, (inv.osVersion as string) ?? null, (inv.architecture as string) ?? null],
  );
  return { ok: true };
}

export async function getConfig(agentId: string, tenantId: string) {
  return queryOne(
    `SELECT revision, config, checksum, updated_at FROM agent_configuration
     WHERE agent_id = $1 AND tenant_id = $2`,
    [agentId, tenantId],
  );
}

export async function setConfig(
  tenantId: string,
  agentId: string,
  config: Record<string, unknown>,
) {
  const existing = await getConfig(agentId, tenantId);
  const revision = Number((existing as { revision?: number } | null)?.revision ?? 0) + 1;
  const checksum = createHash('sha256').update(JSON.stringify(config)).digest('hex');
  const row = await queryOne(
    `INSERT INTO agent_configuration (agent_id, tenant_id, revision, config, checksum, updated_at)
     VALUES ($1,$2,$3,$4,$5,NOW())
     ON CONFLICT (agent_id) DO UPDATE SET
       revision = EXCLUDED.revision,
       config = EXCLUDED.config,
       checksum = EXCLUDED.checksum,
       updated_at = NOW()
     RETURNING revision, config, checksum, updated_at`,
    [agentId, tenantId, revision, JSON.stringify(config), checksum],
  );
  await recordEvent(tenantId, agentId, 'agent.config_updated', 'info', `Config revision ${revision}`);
  return row;
}

export async function reportPlugins(
  tenantId: string,
  agentId: string,
  plugins: Array<{ pluginId: string; name: string; version?: string; status?: string; metadata?: Record<string, unknown> }>,
) {
  for (const p of plugins) {
    await query(
      `INSERT INTO agent_plugins (agent_id, tenant_id, plugin_id, name, version, status, last_run_at, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7)
       ON CONFLICT (agent_id, plugin_id) DO UPDATE SET
         name = EXCLUDED.name,
         version = EXCLUDED.version,
         status = EXCLUDED.status,
         last_run_at = NOW(),
         metadata = EXCLUDED.metadata`,
      [
        agentId,
        tenantId,
        p.pluginId,
        p.name,
        p.version ?? null,
        p.status ?? 'enabled',
        JSON.stringify(p.metadata ?? {}),
      ],
    );
  }
  return { ok: true, count: plugins.length };
}

export async function getUpdateManifest(tenantId: string, platform: string, channel = 'stable') {
  return queryOne(
    `SELECT version, download_url AS "downloadUrl", checksum_sha256 AS "checksumSha256",
            signature, release_notes AS "releaseNotes", mandatory, channel, platform
     FROM agent_versions
     WHERE (tenant_id IS NULL OR tenant_id = $1)
       AND channel = $2
       AND (platform IS NULL OR platform = $3)
     ORDER BY created_at DESC
     LIMIT 1`,
    [tenantId, channel, platform],
  );
}

export async function fleetSummary(tenantId: string) {
  const row = await queryOne<{
    total: string;
    online: string;
    offline: string;
    degraded: string;
  }>(
    `SELECT
       COUNT(*)::text AS total,
       COUNT(*) FILTER (WHERE status = 'online' AND last_heartbeat_at > NOW() - INTERVAL '2 minutes')::text AS online,
       COUNT(*) FILTER (WHERE last_heartbeat_at IS NULL OR last_heartbeat_at <= NOW() - INTERVAL '2 minutes')::text AS offline,
       COUNT(*) FILTER (WHERE status = 'degraded')::text AS degraded
     FROM agents WHERE tenant_id = $1`,
    [tenantId],
  );
  const platforms = await query<{ platform: string; c: string }>(
    `SELECT platform, COUNT(*)::text AS c FROM agents WHERE tenant_id = $1 GROUP BY platform`,
    [tenantId],
  );
  const versions = await query<{ version: string; c: string }>(
    `SELECT COALESCE(version,'unknown') AS version, COUNT(*)::text AS c
     FROM agents WHERE tenant_id = $1 GROUP BY version ORDER BY c DESC LIMIT 20`,
    [tenantId],
  );
  return {
    total: Number(row?.total ?? 0),
    online: Number(row?.online ?? 0),
    offline: Number(row?.offline ?? 0),
    degraded: Number(row?.degraded ?? 0),
    platforms: platforms.map((p) => ({ platform: p.platform, count: Number(p.c) })),
    versions: versions.map((v) => ({ version: v.version, count: Number(v.c) })),
  };
}

export async function recordEvent(
  tenantId: string,
  agentId: string | null,
  eventType: string,
  severity: string,
  message?: string,
  payload: Record<string, unknown> = {},
) {
  await query(
    `INSERT INTO agent_events (agent_id, tenant_id, event_type, severity, message, payload)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [agentId, tenantId, eventType, severity, message ?? null, JSON.stringify(payload)],
  ).catch(() => undefined);
}

export async function bulkSetStatus(tenantId: string, agentIds: string[], status: string) {
  if (!agentIds.length) return { updated: 0 };
  const result = await query(
    `UPDATE agents SET status = $2, updated_at = NOW()
     WHERE tenant_id = $1 AND id = ANY($3::uuid[])
     RETURNING id`,
    [tenantId, status, agentIds],
  );
  return { updated: result.length };
}
