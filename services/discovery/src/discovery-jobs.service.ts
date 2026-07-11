import { createHash } from 'crypto';
import { query, queryOne } from '@opsedge360/shared-db';
import type { DiscoveredAsset } from '@opsedge360/shared-types';
import { getConnector } from './connectors/registry';
import type { ConnectorConfig } from './connectors/types';
import { createSecretsProvider } from '@opsedge360/shared-security';

export interface DiscoveryJobInput {
  name: string;
  jobType?: 'scheduled' | 'on_demand' | 'incremental' | 'full';
  connectorIds?: string[];
  scheduleCron?: string;
  priority?: number;
  parallelWorkers?: number;
  rateLimitPerMin?: number;
  retryMax?: number;
  metadata?: Record<string, unknown>;
}

async function resolveConnectorConfig(
  tenantId: string,
  config: ConnectorConfig,
  secretRef?: string | null,
): Promise<ConnectorConfig> {
  const merged = { ...config };
  const ref = secretRef ?? (typeof config.secretRef === 'string' ? config.secretRef : null);
  if (!ref) return merged;
  try {
    const provider = createSecretsProvider();
    const revealed = await provider.reveal(tenantId, ref);
    let secretPayload: Record<string, unknown> = {};
    try {
      secretPayload = JSON.parse(revealed.value) as Record<string, unknown>;
    } catch {
      secretPayload = { password: revealed.value, token: revealed.value };
    }
    return { ...merged, ...secretPayload, _secretResolved: true };
  } catch (err) {
    console.warn('[discovery] secret resolve failed:', (err as Error).message);
    return merged;
  }
}

export async function listProviders() {
  const { listConnectors } = await import('./connectors/registry');
  const { SUPPORTED_PROTOCOLS } = await import('./connectors/types');
  return {
    protocols: [...SUPPORTED_PROTOCOLS],
    providers: listConnectors().map((c) => ({ name: c.name, protocol: c.protocol })),
  };
}

export async function createJob(tenantId: string, input: DiscoveryJobInput) {
  return queryOne(
    `INSERT INTO discovery_jobs
      (tenant_id, name, job_type, connector_ids, schedule_cron, priority, parallel_workers, rate_limit_per_min, retry_max, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      tenantId,
      input.name,
      input.jobType ?? 'on_demand',
      input.connectorIds ?? [],
      input.scheduleCron ?? null,
      input.priority ?? 100,
      input.parallelWorkers ?? 2,
      input.rateLimitPerMin ?? 60,
      input.retryMax ?? 3,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
}

export async function listJobs(tenantId: string) {
  return query(`SELECT * FROM discovery_jobs WHERE tenant_id = $1 ORDER BY priority ASC, name`, [tenantId]);
}

export async function getJob(tenantId: string, jobId: string) {
  return queryOne(`SELECT * FROM discovery_jobs WHERE tenant_id = $1 AND id = $2`, [tenantId, jobId]);
}

export async function listRuns(tenantId: string, opts: { limit?: number; jobId?: string } = {}) {
  const limit = Math.min(opts.limit ?? 50, 200);
  if (opts.jobId) {
    return query(
      `SELECT * FROM discovery_runs WHERE tenant_id = $1 AND job_id = $2 ORDER BY created_at DESC LIMIT $3`,
      [tenantId, opts.jobId, limit],
    );
  }
  return query(
    `SELECT * FROM discovery_runs WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [tenantId, limit],
  );
}

export async function listResults(tenantId: string, runId: string, limit = 200) {
  return query(
    `SELECT id, external_id, name, ci_type, payload, ci_id, created_at
     FROM discovery_results WHERE tenant_id = $1 AND run_id = $2
     ORDER BY created_at ASC LIMIT $3`,
    [tenantId, runId, Math.min(limit, 1000)],
  );
}

export async function createTarget(
  tenantId: string,
  input: {
    name: string;
    targetType?: string;
    address?: string;
    connectorId?: string;
    credentialsSecretRef?: string;
    config?: Record<string, unknown>;
  },
) {
  return queryOne(
    `INSERT INTO discovery_targets
      (tenant_id, connector_id, name, target_type, address, credentials_secret_ref, config)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      tenantId,
      input.connectorId ?? null,
      input.name,
      input.targetType ?? 'host',
      input.address ?? null,
      input.credentialsSecretRef ?? null,
      JSON.stringify(input.config ?? {}),
    ],
  );
}

export async function listTargets(tenantId: string) {
  return query(`SELECT * FROM discovery_targets WHERE tenant_id = $1 ORDER BY name`, [tenantId]);
}

type PublishFn = (tenantId: string, asset: DiscoveredAsset, source: string) => Promise<void>;

export async function executeDiscoveryRun(opts: {
  tenantId: string;
  connectorId: string;
  jobId?: string | null;
  runMode?: string;
  publishAsset: PublishFn;
  attempt?: number;
}): Promise<{
  runId: string;
  status: string;
  assetsDiscovered: number;
  relationshipsInferred: number;
  assets: DiscoveredAsset[];
}> {
  const connectorRow = await queryOne<{
    id: string;
    name: string;
    protocol: string;
    config: ConnectorConfig;
    enabled: boolean;
    secret_ref: string | null;
    rate_limit_per_min: number;
  }>(
    `SELECT id, name, protocol, config, enabled, secret_ref, rate_limit_per_min
     FROM discovery_connectors WHERE tenant_id = $1 AND id = $2`,
    [opts.tenantId, opts.connectorId],
  );
  if (!connectorRow || !connectorRow.enabled) {
    throw new Error('Connector not found or disabled');
  }

  const run = await queryOne<{ id: string }>(
    `INSERT INTO discovery_runs
      (tenant_id, job_id, connector_id, run_mode, status, attempt, started_at)
     VALUES ($1,$2,$3,$4,'running',$5,NOW()) RETURNING id`,
    [
      opts.tenantId,
      opts.jobId ?? null,
      opts.connectorId,
      opts.runMode ?? 'full',
      opts.attempt ?? 1,
    ],
  );
  if (!run) throw new Error('Failed to create discovery run');

  const connector = getConnector(connectorRow.protocol);
  if (!connector) {
    await query(
      `UPDATE discovery_runs SET status='failed', error_message=$2, completed_at=NOW() WHERE id=$1`,
      [run.id, `Unsupported protocol: ${connectorRow.protocol}`],
    );
    throw new Error(`Unsupported protocol: ${connectorRow.protocol}`);
  }

  const config = await resolveConnectorConfig(opts.tenantId, connectorRow.config ?? {}, connectorRow.secret_ref);
  const assets: DiscoveredAsset[] = [];
  let relationshipsInferred = 0;
  const rateLimit = connectorRow.rate_limit_per_min || 60;
  let produced = 0;
  const windowStart = Date.now();

  try {
    for await (const asset of connector.discover(config)) {
      // simple rate limit
      produced += 1;
      if (produced > rateLimit && Date.now() - windowStart < 60_000) {
        await new Promise((r) => setTimeout(r, 250));
      }
      assets.push(asset);
      relationshipsInferred += asset.relationships?.length ?? 0;
      await query(
        `INSERT INTO discovery_results (tenant_id, run_id, external_id, name, ci_type, payload)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          opts.tenantId,
          run.id,
          asset.externalId ?? null,
          asset.name,
          asset.ciType,
          JSON.stringify(asset),
        ],
      );
      await opts.publishAsset(opts.tenantId, asset, connectorRow.protocol);
    }

    await query(
      `UPDATE discovery_runs
       SET status='completed', assets_discovered=$2, relationships_inferred=$3, completed_at=NOW()
       WHERE id=$1`,
      [run.id, assets.length, relationshipsInferred],
    );
    await query(`UPDATE discovery_connectors SET last_run_at = NOW() WHERE id = $1`, [opts.connectorId]);
    return {
      runId: run.id,
      status: 'completed',
      assetsDiscovered: assets.length,
      relationshipsInferred,
      assets,
    };
  } catch (err) {
    await query(
      `UPDATE discovery_runs
       SET status='failed', error_message=$2, assets_discovered=$3, completed_at=NOW()
       WHERE id=$1`,
      [run.id, (err as Error).message, assets.length],
    );
    throw err;
  }
}

export async function runJob(tenantId: string, jobId: string, publishAsset: PublishFn) {
  const job = await getJob(tenantId, jobId);
  if (!job) throw new Error('Job not found');
  const connectorIds = (job.connector_ids as string[]) ?? [];
  if (!connectorIds.length) throw new Error('Job has no connectors');

  const workers = Math.max(1, Number(job.parallel_workers ?? 2));
  const runMode = job.job_type === 'incremental' ? 'incremental' : 'full';
  const results: Array<Record<string, unknown>> = [];
  let idx = 0;

  async function worker() {
    while (idx < connectorIds.length) {
      const current = idx;
      idx += 1;
      const connectorId = connectorIds[current];
      try {
        const r = await executeDiscoveryRun({
          tenantId,
          connectorId,
          jobId,
          runMode,
          publishAsset,
        });
        results.push({ connectorId, ...r });
      } catch (err) {
        results.push({ connectorId, status: 'failed', error: (err as Error).message });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(workers, connectorIds.length) }, () => worker()));
  return { jobId, results };
}

export function checksumAttrs(attrs: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(attrs ?? {})).digest('hex');
}
