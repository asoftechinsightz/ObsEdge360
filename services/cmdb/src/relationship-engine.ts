import { createHash } from 'crypto';
import { query, queryOne } from '@opsedge360/shared-db';
import type { RelationshipType } from '@opsedge360/shared-types';
import * as repo from './cmdb.repository';

function checksum(obj: unknown): string {
  return createHash('sha256').update(JSON.stringify(obj ?? {})).digest('hex');
}

/** Infer additional relationships from CI attributes after discovery ingest. */
export async function inferRelationshipsForCi(tenantId: string, ciId: string): Promise<number> {
  const ci = await repo.getCiById(tenantId, ciId);
  if (!ci) return 0;
  let created = 0;
  const attrs = ci.attributes ?? {};

  const candidates: Array<{ externalId?: string; type: RelationshipType }> = [];
  if (typeof attrs.hostExternalId === 'string') {
    candidates.push({ externalId: attrs.hostExternalId, type: 'runs_on' });
  }
  if (typeof attrs.clusterExternalId === 'string') {
    candidates.push({ externalId: attrs.clusterExternalId, type: 'member_of' });
  }
  if (typeof attrs.databaseExternalId === 'string') {
    candidates.push({ externalId: attrs.databaseExternalId, type: 'uses' });
  }
  if (Array.isArray(attrs.dependsOnExternalIds)) {
    for (const id of attrs.dependsOnExternalIds as string[]) {
      candidates.push({ externalId: id, type: 'depends_on' });
    }
  }

  for (const c of candidates) {
    if (!c.externalId) continue;
    const target = await repo.getCiByExternalId(tenantId, c.externalId);
    if (!target) continue;
    await repo.upsertRelationship(tenantId, ci.id, target.id, c.type);
    created += 1;
  }

  // Same-host containers → host
  if (ci.ciType === 'container' && typeof attrs.host === 'string') {
    const hosts = await repo.listCis(tenantId, { ciType: 'server', search: String(attrs.host), limit: 5 });
    for (const h of hosts) {
      if (h.attributes?.host === attrs.host || h.name.includes(String(attrs.host))) {
        await repo.upsertRelationship(tenantId, ci.id, h.id, 'runs_on');
        created += 1;
      }
    }
  }

  return created;
}

export async function recordConfigurationHistory(
  tenantId: string,
  ciId: string,
  changeType: string,
  beforeAttrs: Record<string, unknown> | null,
  afterAttrs: Record<string, unknown>,
  source = 'discovery',
): Promise<void> {
  const versionRow = await queryOne<{ v: string }>(
    `SELECT COALESCE(MAX(version),0)::text AS v FROM configuration_history WHERE ci_id = $1`,
    [ciId],
  );
  const version = Number(versionRow?.v ?? 0) + 1;
  await query(
    `INSERT INTO configuration_history
      (tenant_id, ci_id, version, change_type, before_hash, after_hash, before_attrs, after_attrs, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      tenantId,
      ciId,
      version,
      changeType,
      beforeAttrs ? checksum(beforeAttrs) : null,
      checksum(afterAttrs),
      beforeAttrs ? JSON.stringify(beforeAttrs) : null,
      JSON.stringify(afterAttrs),
      source,
    ],
  ).catch(() => undefined);

  // Mirror into legacy ci_config_history when present
  await query(
    `INSERT INTO ci_config_history (tenant_id, ci_id, version, attributes, checksum, change_type, changed_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (ci_id, version) DO NOTHING`,
    [tenantId, ciId, version, JSON.stringify(afterAttrs), checksum(afterAttrs), changeType, source],
  ).catch(() => undefined);
}

export async function detectAndRecordDrift(
  tenantId: string,
  ciId: string,
  beforeAttrs: Record<string, unknown> | null,
  afterAttrs: Record<string, unknown>,
): Promise<boolean> {
  if (!beforeAttrs) return false;
  const beforeHash = checksum(beforeAttrs);
  const afterHash = checksum(afterAttrs);
  if (beforeHash === afterHash) return false;

  const details: Record<string, unknown> = { beforeHash, afterHash, changedKeys: [] as string[] };
  const keys = new Set([...Object.keys(beforeAttrs), ...Object.keys(afterAttrs)]);
  for (const k of keys) {
    if (JSON.stringify(beforeAttrs[k]) !== JSON.stringify(afterAttrs[k])) {
      (details.changedKeys as string[]).push(k);
    }
  }

  await query(
    `INSERT INTO drift_events (tenant_id, ci_id, drift_type, severity, summary, details)
     VALUES ($1,$2,'configuration_change',$3,$4,$5)`,
    [
      tenantId,
      ciId,
      (details.changedKeys as string[]).length > 5 ? 'high' : 'medium',
      `Configuration drift on CI ${ciId}`,
      JSON.stringify(details),
    ],
  ).catch(() => undefined);

  await query(
    `INSERT INTO ci_config_drift (tenant_id, ci_id, expected_checksum, actual_checksum, drift_details, severity)
     VALUES ($1,$2,$3,$4,$5,'medium')`,
    [tenantId, ciId, beforeHash, afterHash, JSON.stringify(details)],
  ).catch(() => undefined);

  return true;
}

export async function listDrift(tenantId: string, opts: { openOnly?: boolean; limit?: number } = {}) {
  const limit = Math.min(opts.limit ?? 50, 200);
  if (opts.openOnly !== false) {
    return query(
      `SELECT * FROM drift_events WHERE tenant_id = $1 AND resolved_at IS NULL
       ORDER BY detected_at DESC LIMIT $2`,
      [tenantId, limit],
    );
  }
  return query(
    `SELECT * FROM drift_events WHERE tenant_id = $1 ORDER BY detected_at DESC LIMIT $2`,
    [tenantId, limit],
  );
}

export async function listHistory(tenantId: string, ciId: string, limit = 50) {
  return query(
    `SELECT * FROM configuration_history WHERE tenant_id = $1 AND ci_id = $2
     ORDER BY version DESC LIMIT $3`,
    [tenantId, ciId, Math.min(limit, 200)],
  );
}

export async function materializeTopologyGraph(
  tenantId: string,
  topologyType: string,
  snapshotId: string,
  graph: { nodes?: Array<Record<string, unknown>>; edges?: Array<Record<string, unknown>> },
): Promise<{ nodes: number; edges: number }> {
  await query(`DELETE FROM topology_nodes WHERE snapshot_id = $1`, [snapshotId]).catch(() => undefined);
  await query(`DELETE FROM topology_edges WHERE snapshot_id = $1`, [snapshotId]).catch(() => undefined);

  let nodes = 0;
  for (const n of graph.nodes ?? []) {
    const key = String(n.id ?? n.key ?? n.ciId ?? `n-${nodes}`);
    await query(
      `INSERT INTO topology_nodes
        (tenant_id, topology_type, snapshot_id, ci_id, node_key, label, node_type, properties)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT DO NOTHING`,
      [
        tenantId,
        topologyType,
        snapshotId,
        (n.ciId as string) ?? null,
        key,
        (n.label as string) ?? (n.name as string) ?? key,
        (n.type as string) ?? (n.ciType as string) ?? 'ci',
        JSON.stringify(n),
      ],
    );
    nodes += 1;
  }

  let edges = 0;
  for (const e of graph.edges ?? []) {
    await query(
      `INSERT INTO topology_edges
        (tenant_id, topology_type, snapshot_id, source_key, target_key, edge_type, properties)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        tenantId,
        topologyType,
        snapshotId,
        String(e.source ?? e.from ?? ''),
        String(e.target ?? e.to ?? ''),
        String(e.type ?? e.relationshipType ?? 'depends_on'),
        JSON.stringify(e),
      ],
    );
    edges += 1;
  }
  return { nodes, edges };
}

export async function listRelationships(tenantId: string, opts: { ciId?: string; limit?: number } = {}) {
  const limit = Math.min(opts.limit ?? 100, 500);
  if (opts.ciId) {
    return query(
      `SELECT * FROM relationships
       WHERE tenant_id = $1 AND (source_ci_id = $2 OR target_ci_id = $2)
       ORDER BY id DESC LIMIT $3`,
      [tenantId, opts.ciId, limit],
    );
  }
  return query(
    `SELECT * FROM relationships WHERE tenant_id = $1 ORDER BY id DESC LIMIT $2`,
    [tenantId, limit],
  );
}
