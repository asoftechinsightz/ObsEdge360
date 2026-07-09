import type { ConfigurationItem, CiType, CiStatus, Relationship, RelationshipType } from '@opsedge360/shared-types';
import { query, queryOne } from '@opsedge360/shared-db';

interface CiRow {
  id: string;
  tenant_id: string;
  external_id: string | null;
  name: string;
  ci_type: CiType;
  status: CiStatus;
  health_score: number;
  compliance_score: number;
  risk_score: number;
  ai_confidence_score: number;
  owner_id: string | null;
  location_id: string | null;
  attributes: Record<string, unknown>;
  tags: string[];
  discovered_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

interface RelRow {
  id: string;
  tenant_id: string;
  source_ci_id: string;
  target_ci_id: string;
  relationship_type: RelationshipType;
  strength: 'weak' | 'normal' | 'critical';
  discovered_by: string;
  ai_confidence_score: number;
  metadata: Record<string, unknown>;
}

function mapCi(row: CiRow): ConfigurationItem {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    externalId: row.external_id ?? undefined,
    name: row.name,
    ciType: row.ci_type,
    status: row.status,
    healthScore: row.health_score,
    complianceScore: row.compliance_score,
    riskScore: row.risk_score,
    aiConfidenceScore: row.ai_confidence_score,
    ownerId: row.owner_id ?? undefined,
    locationId: row.location_id ?? undefined,
    attributes: row.attributes ?? {},
    tags: row.tags ?? [],
    discoveredAt: row.discovered_at ?? undefined,
    lastSeenAt: row.last_seen_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRel(row: RelRow): Relationship {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    sourceCiId: row.source_ci_id,
    targetCiId: row.target_ci_id,
    relationshipType: row.relationship_type,
    strength: row.strength,
    aiConfidenceScore: row.ai_confidence_score,
    metadata: row.metadata ?? {},
  };
}

export async function listCis(
  tenantId: string,
  filters: { ciType?: string; search?: string; limit?: number } = {},
): Promise<ConfigurationItem[]> {
  const conditions = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (filters.ciType) {
    conditions.push(`ci_type = $${idx++}`);
    params.push(filters.ciType);
  }
  if (filters.search) {
    conditions.push(`name ILIKE $${idx++}`);
    params.push(`%${filters.search}%`);
  }

  const limit = filters.limit ?? 500;
  params.push(limit);

  const rows = await query<CiRow>(
    `SELECT * FROM configuration_items WHERE ${conditions.join(' AND ')}
     ORDER BY updated_at DESC LIMIT $${idx}`,
    params,
  );
  return rows.map(mapCi);
}

export async function getCiById(tenantId: string, id: string): Promise<ConfigurationItem | null> {
  const row = await queryOne<CiRow>(
    'SELECT * FROM configuration_items WHERE tenant_id = $1 AND id = $2',
    [tenantId, id],
  );
  return row ? mapCi(row) : null;
}

export async function getCiByExternalId(
  tenantId: string,
  externalId: string,
): Promise<ConfigurationItem | null> {
  const row = await queryOne<CiRow>(
    'SELECT * FROM configuration_items WHERE tenant_id = $1 AND external_id = $2',
    [tenantId, externalId],
  );
  return row ? mapCi(row) : null;
}

export interface UpsertCiInput {
  externalId?: string;
  name: string;
  ciType: CiType;
  status?: CiStatus;
  healthScore?: number;
  complianceScore?: number;
  riskScore?: number;
  aiConfidenceScore?: number;
  attributes?: Record<string, unknown>;
  tags?: string[];
  source?: string;
}

export async function upsertCi(tenantId: string, input: UpsertCiInput): Promise<ConfigurationItem> {
  const existing = input.externalId
    ? await getCiByExternalId(tenantId, input.externalId)
    : null;

  if (existing) {
    return updateCi(tenantId, existing.id, input);
  }

  const row = await queryOne<CiRow>(
    `INSERT INTO configuration_items (
      tenant_id, external_id, name, ci_type, status,
      health_score, compliance_score, risk_score, ai_confidence_score,
      attributes, tags, discovered_at, last_seen_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
    RETURNING *`,
    [
      tenantId, input.externalId ?? null, input.name, input.ciType,
      input.status ?? 'discovered',
      input.healthScore ?? 100, input.complianceScore ?? 100,
      input.riskScore ?? 0, input.aiConfidenceScore ?? 80,
      JSON.stringify(input.attributes ?? {}), input.tags ?? [],
    ],
  );
  await recordChange(tenantId, row!.id, 'created', null, row);
  return mapCi(row!);
}

export async function updateCi(
  tenantId: string,
  id: string,
  input: Partial<UpsertCiInput> & { name?: string; ciType?: CiType },
): Promise<ConfigurationItem> {
  const existing = await getCiById(tenantId, id);
  if (!existing) throw new Error('CI not found');

  const row = await queryOne<CiRow>(
    `UPDATE configuration_items SET
      name = COALESCE($3, name),
      ci_type = COALESCE($4, ci_type),
      status = COALESCE($5, status),
      health_score = COALESCE($6, health_score),
      compliance_score = COALESCE($7, compliance_score),
      risk_score = COALESCE($8, risk_score),
      ai_confidence_score = COALESCE($9, ai_confidence_score),
      attributes = CASE WHEN $10::text IS NULL THEN attributes ELSE attributes || $10::jsonb END,
      tags = COALESCE($11, tags),
      external_id = COALESCE($12, external_id),
      last_seen_at = NOW(), updated_at = NOW()
    WHERE tenant_id = $1 AND id = $2
    RETURNING *`,
    [
      tenantId,
      id,
      input.name ?? null,
      input.ciType ?? null,
      input.status ?? null,
      input.healthScore ?? null,
      input.complianceScore ?? null,
      input.riskScore ?? null,
      input.aiConfidenceScore ?? null,
      input.attributes ? JSON.stringify(input.attributes) : null,
      input.tags ?? null,
      input.externalId ?? null,
    ],
  );
  await recordChange(tenantId, id, 'updated', existing, row);
  return mapCi(row!);
}

export async function deleteCi(tenantId: string, id: string): Promise<boolean> {
  const existing = await getCiById(tenantId, id);
  if (!existing) return false;

  await query('DELETE FROM relationships WHERE tenant_id = $1 AND (source_ci_id = $2 OR target_ci_id = $2)', [
    tenantId,
    id,
  ]);
  await query('DELETE FROM configuration_items WHERE tenant_id = $1 AND id = $2', [tenantId, id]);
  await recordChange(tenantId, id, 'deleted', existing, null);
  return true;
}

export async function getRelationships(tenantId: string, ciId: string): Promise<Relationship[]> {
  const rows = await query<RelRow>(
    `SELECT * FROM relationships
     WHERE tenant_id = $1 AND (source_ci_id = $2 OR target_ci_id = $2)`,
    [tenantId, ciId],
  );
  return rows.map(mapRel);
}

export async function upsertRelationship(
  tenantId: string,
  sourceCiId: string,
  targetCiId: string,
  relationshipType: RelationshipType,
  opts: { strength?: 'weak' | 'normal' | 'critical'; confidence?: number } = {},
): Promise<Relationship> {
  if (sourceCiId === targetCiId) throw new Error('Source and target CI must differ');

  const source = await getCiById(tenantId, sourceCiId);
  const target = await getCiById(tenantId, targetCiId);
  if (!source || !target) throw new Error('Source or target CI not found');

  const existing = await queryOne<RelRow>(
    `SELECT * FROM relationships
     WHERE tenant_id = $1 AND source_ci_id = $2 AND target_ci_id = $3 AND relationship_type = $4`,
    [tenantId, sourceCiId, targetCiId, relationshipType],
  );

  if (existing) return mapRel(existing);

  const row = await queryOne<RelRow>(
    `INSERT INTO relationships (tenant_id, source_ci_id, target_ci_id, relationship_type, strength, ai_confidence_score)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [tenantId, sourceCiId, targetCiId, relationshipType, opts.strength ?? 'normal', opts.confidence ?? 80],
  );
  return mapRel(row!);
}

export async function deleteRelationship(tenantId: string, relationshipId: string): Promise<boolean> {
  const rows = await query(
    'DELETE FROM relationships WHERE tenant_id = $1 AND id = $2 RETURNING id',
    [tenantId, relationshipId],
  );
  return rows.length > 0;
}

export async function listRelationships(tenantId: string, limit = 2000): Promise<Relationship[]> {
  const rows = await query<RelRow>(
    'SELECT * FROM relationships WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2',
    [tenantId, limit],
  );
  return rows.map(mapRel);
}

export async function getTwinGraph(tenantId: string): Promise<{ nodes: ConfigurationItem[]; edges: Relationship[] }> {
  const cis = await listCis(tenantId, { limit: 1000 });
  const edgeRows = await query<RelRow>(
    'SELECT * FROM relationships WHERE tenant_id = $1 LIMIT 2000',
    [tenantId],
  );
  return { nodes: cis, edges: edgeRows.map(mapRel) };
}

export async function getStats(tenantId: string) {
  const row = await queryOne<{
    total: string;
    avg_health: string;
    open_alerts: string;
    relationships: string;
    active: string;
    at_risk: string;
  }>(
    `SELECT
      (SELECT COUNT(*) FROM configuration_items WHERE tenant_id = $1) as total,
      (SELECT COALESCE(AVG(health_score), 100) FROM configuration_items WHERE tenant_id = $1) as avg_health,
      (SELECT COUNT(*) FROM alerts WHERE tenant_id = $1 AND status = 'open') as open_alerts,
      (SELECT COUNT(*) FROM relationships WHERE tenant_id = $1) as relationships,
      (SELECT COUNT(*) FROM configuration_items WHERE tenant_id = $1 AND status = 'active') as active,
      (SELECT COUNT(*) FROM configuration_items WHERE tenant_id = $1 AND risk_score >= 50) as at_risk`,
    [tenantId],
  );

  const byType = await query<{ ci_type: string; count: string }>(
    `SELECT ci_type, COUNT(*)::text AS count
     FROM configuration_items WHERE tenant_id = $1
     GROUP BY ci_type ORDER BY COUNT(*) DESC`,
    [tenantId],
  );

  const byStatus = await query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::text AS count
     FROM configuration_items WHERE tenant_id = $1
     GROUP BY status ORDER BY COUNT(*) DESC`,
    [tenantId],
  );

  return {
    totalAssets: Number(row?.total ?? 0),
    avgHealth: Math.round(Number(row?.avg_health ?? 100)),
    openAlerts: Number(row?.open_alerts ?? 0),
    relationships: Number(row?.relationships ?? 0),
    activeAssets: Number(row?.active ?? 0),
    atRiskAssets: Number(row?.at_risk ?? 0),
    byType: byType.map((r) => ({ type: r.ci_type, count: Number(r.count) })),
    byStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
  };
}

export interface ImpactNode {
  id: string;
  name: string;
  ciType: string;
  status: string;
  healthScore: number;
  riskScore: number;
  depth: number;
  path: string[];
}

export interface BlastRadiusResult {
  rootCiId: string;
  rootCiName: string;
  rootCiType: string;
  depth: number;
  direction: 'downstream' | 'upstream' | 'both';
  affectedCis: number;
  criticalCount: number;
  atRiskCount: number;
  avgHealth: number;
  nodes: ImpactNode[];
  edges: Array<{ source: string; target: string; type: string; strength: string }>;
  source: 'postgres' | 'neo4j';
}

/**
 * BFS impact analysis over PostgreSQL relationships (works without Neo4j).
 * downstream = outgoing deps (what breaks if root fails)
 * upstream = incoming deps (what depends on root from the other direction)
 */
export async function analyzeBlastRadius(
  tenantId: string,
  rootCiId: string,
  opts: { depth?: number; direction?: 'downstream' | 'upstream' | 'both' } = {},
): Promise<BlastRadiusResult | null> {
  const root = await getCiById(tenantId, rootCiId);
  if (!root) return null;

  const maxDepth = Math.min(Math.max(opts.depth ?? 3, 1), 6);
  const direction = opts.direction ?? 'downstream';
  const allRels = await listRelationships(tenantId);

  const outgoing = new Map<string, Array<{ target: string; type: string; strength: string }>>();
  const incoming = new Map<string, Array<{ source: string; type: string; strength: string }>>();

  for (const r of allRels) {
    if (!outgoing.has(r.sourceCiId)) outgoing.set(r.sourceCiId, []);
    outgoing.get(r.sourceCiId)!.push({
      target: r.targetCiId,
      type: r.relationshipType,
      strength: r.strength,
    });
    if (!incoming.has(r.targetCiId)) incoming.set(r.targetCiId, []);
    incoming.get(r.targetCiId)!.push({
      source: r.sourceCiId,
      type: r.relationshipType,
      strength: r.strength,
    });
  }

  const visited = new Map<string, ImpactNode>();
  const queue: Array<{ id: string; depth: number; path: string[] }> = [
    { id: rootCiId, depth: 0, path: [rootCiId] },
  ];
  visited.set(rootCiId, {
    id: root.id,
    name: root.name,
    ciType: root.ciType,
    status: root.status,
    healthScore: root.healthScore,
    riskScore: root.riskScore,
    depth: 0,
    path: [rootCiId],
  });

  const edgeSet = new Map<string, { source: string; target: string; type: string; strength: string }>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    const neighbors: Array<{ id: string; type: string; strength: string; edgeSource: string; edgeTarget: string }> = [];

    if (direction === 'downstream' || direction === 'both') {
      for (const e of outgoing.get(current.id) ?? []) {
        neighbors.push({
          id: e.target,
          type: e.type,
          strength: e.strength,
          edgeSource: current.id,
          edgeTarget: e.target,
        });
      }
    }
    if (direction === 'upstream' || direction === 'both') {
      for (const e of incoming.get(current.id) ?? []) {
        neighbors.push({
          id: e.source,
          type: e.type,
          strength: e.strength,
          edgeSource: e.source,
          edgeTarget: current.id,
        });
      }
    }

    for (const n of neighbors) {
      const edgeKey = `${n.edgeSource}->${n.edgeTarget}:${n.type}`;
      if (!edgeSet.has(edgeKey)) {
        edgeSet.set(edgeKey, {
          source: n.edgeSource,
          target: n.edgeTarget,
          type: n.type,
          strength: n.strength,
        });
      }

      if (visited.has(n.id)) continue;
      const ci = await getCiById(tenantId, n.id);
      if (!ci) continue;

      const node: ImpactNode = {
        id: ci.id,
        name: ci.name,
        ciType: ci.ciType,
        status: ci.status,
        healthScore: ci.healthScore,
        riskScore: ci.riskScore,
        depth: current.depth + 1,
        path: [...current.path, ci.id],
      };
      visited.set(n.id, node);
      queue.push({ id: n.id, depth: current.depth + 1, path: node.path });
    }
  }

  const nodes = [...visited.values()].sort((a, b) => a.depth - b.depth || a.name.localeCompare(b.name));
  const affected = nodes.filter((n) => n.depth > 0);
  const healthSum = affected.reduce((s, n) => s + n.healthScore, 0);

  return {
    rootCiId: root.id,
    rootCiName: root.name,
    rootCiType: root.ciType,
    depth: maxDepth,
    direction,
    affectedCis: affected.length,
    criticalCount: affected.filter((n) => n.riskScore >= 70 || n.healthScore < 70).length,
    atRiskCount: affected.filter((n) => n.riskScore >= 50).length,
    avgHealth: affected.length ? Math.round(healthSum / affected.length) : 100,
    nodes,
    edges: [...edgeSet.values()],
    source: 'postgres',
  };
}

export async function importCis(
  tenantId: string,
  items: UpsertCiInput[],
): Promise<{ imported: number; errors: string[] }> {
  let imported = 0;
  const errors: string[] = [];
  for (const [i, item] of items.entries()) {
    try {
      if (!item.name || !item.ciType) {
        errors.push(`Row ${i + 1}: name and ciType required`);
        continue;
      }
      await upsertCi(tenantId, item);
      imported += 1;
    } catch (err) {
      errors.push(`Row ${i + 1}: ${(err as Error).message}`);
    }
  }
  return { imported, errors };
}

async function recordChange(
  tenantId: string,
  ciId: string,
  changeType: string,
  before: CiRow | ConfigurationItem | null,
  after: CiRow | null,
): Promise<void> {
  await query(
    `INSERT INTO change_records (tenant_id, ci_id, change_type, before_state, after_state, changed_by)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [tenantId, ciId, changeType, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null, 'discovery-agent'],
  );
}
