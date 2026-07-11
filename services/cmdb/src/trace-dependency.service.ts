import { query, queryOne } from '@opsedge360/shared-db';
import * as repo from './cmdb.repository';
import type { RelationshipType } from '@opsedge360/shared-types';
import { publishAndBroadcast } from './topology-events';

export interface InferredDependency {
  id: string;
  tenantId: string;
  sourceCiId: string | null;
  targetCiId: string | null;
  sourceService: string;
  targetService: string;
  relationshipType: string;
  layer: string;
  origin: string;
  callCount: number;
  avgLatencyMs: number;
  errorCount: number;
  confidence: number;
  windowHours: number;
  lastSeenAt: string;
}

interface SpanEdgeRow {
  source: string;
  target: string;
  calls: string;
  avg_duration: string;
  error_count: string;
}

function mapDep(row: Record<string, unknown>): InferredDependency {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    sourceCiId: row.source_ci_id ? String(row.source_ci_id) : null,
    targetCiId: row.target_ci_id ? String(row.target_ci_id) : null,
    sourceService: String(row.source_service),
    targetService: String(row.target_service),
    relationshipType: String(row.relationship_type),
    layer: String(row.layer),
    origin: String(row.origin),
    callCount: Number(row.call_count ?? 0),
    avgLatencyMs: Number(row.avg_latency_ms ?? 0),
    errorCount: Number(row.error_count ?? 0),
    confidence: Number(row.confidence ?? 80),
    windowHours: Number(row.window_hours ?? 1),
    lastSeenAt: String(row.last_seen_at),
  };
}

async function resolveServiceCi(tenantId: string, serviceName: string) {
  const byExternal = await repo.getCiByExternalId(tenantId, serviceName);
  if (byExternal) return byExternal;
  const bySvcKey = await repo.getCiByExternalId(tenantId, `svc:${serviceName}`);
  if (bySvcKey) return bySvcKey;
  const byName = await queryOne<{ id: string }>(
    `SELECT id FROM configuration_items
     WHERE tenant_id = $1 AND (LOWER(name) = LOWER($2) OR attributes->>'service_name' = $2)
     ORDER BY updated_at DESC LIMIT 1`,
    [tenantId, serviceName],
  );
  if (byName) return repo.getCiById(tenantId, byName.id);

  return repo.upsertCi(tenantId, {
    externalId: `svc:${serviceName}`,
    name: serviceName,
    ciType: 'service',
    status: 'active',
    attributes: { service_name: serviceName, discoveredBy: 'trace-dependency' },
    tags: ['trace-inferred'],
    aiConfidenceScore: 75,
  });
}

/**
 * Reconcile parent→child span edges into inferred_dependencies and CMDB relationships.
 */
export async function syncTraceDependencies(
  tenantId: string,
  hours = 1,
): Promise<{ edgesUpserted: number; relationshipsCreated: number; windowHours: number }> {
  const windowHours = Math.min(Math.max(hours, 1), 24);

  let edges: SpanEdgeRow[] = [];
  try {
    edges = await query<SpanEdgeRow>(
      `SELECT p.service_name as source, c.service_name as target,
        COUNT(*)::text as calls,
        COALESCE(AVG(c.duration_ms), 0)::text as avg_duration,
        COUNT(*) FILTER (WHERE c.status_code IN ('ERROR', 'STATUS_CODE_ERROR', '2'))::text as error_count
       FROM otlp_spans c
       JOIN otlp_spans p
         ON p.tenant_id = c.tenant_id
        AND p.trace_id = c.trace_id
        AND p.span_id = c.parent_span_id
       WHERE c.tenant_id = $1
         AND c.recorded_at > NOW() - ($2 * INTERVAL '1 hour')
         AND p.service_name IS NOT NULL
         AND c.service_name IS NOT NULL
         AND p.service_name <> c.service_name
       GROUP BY p.service_name, c.service_name
       ORDER BY COUNT(*) DESC
       LIMIT 500`,
      [tenantId, windowHours],
    );
  } catch (err) {
    console.warn('[cmdb] trace sync query failed:', (err as Error).message);
    edges = [];
  }

  let edgesUpserted = 0;
  let relationshipsCreated = 0;

  for (const e of edges) {
    const sourceCi = await resolveServiceCi(tenantId, e.source);
    const targetCi = await resolveServiceCi(tenantId, e.target);
    if (!sourceCi || !targetCi) continue;

    const calls = Number(e.calls);
    const avgLatency = Math.round(Number(e.avg_duration) * 10) / 10;
    const errors = Number(e.error_count);
    const confidence = Math.min(99, 60 + Math.floor(Math.log10(calls + 1) * 15));

    await query(
      `INSERT INTO inferred_dependencies
        (tenant_id, source_ci_id, target_ci_id, source_service, target_service,
         relationship_type, layer, origin, call_count, avg_latency_ms, error_count,
         confidence, window_hours, last_seen_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,'calls','service','trace',$6,$7,$8,$9,$10,NOW(),NOW())
       ON CONFLICT (tenant_id, source_service, target_service, origin)
       DO UPDATE SET
         source_ci_id = EXCLUDED.source_ci_id,
         target_ci_id = EXCLUDED.target_ci_id,
         call_count = EXCLUDED.call_count,
         avg_latency_ms = EXCLUDED.avg_latency_ms,
         error_count = EXCLUDED.error_count,
         confidence = EXCLUDED.confidence,
         window_hours = EXCLUDED.window_hours,
         last_seen_at = NOW(),
         updated_at = NOW()`,
      [
        tenantId,
        sourceCi.id,
        targetCi.id,
        e.source,
        e.target,
        calls,
        avgLatency,
        errors,
        confidence,
        windowHours,
      ],
    );
    edgesUpserted += 1;

    const existing = await queryOne(
      `SELECT id FROM relationships
       WHERE tenant_id = $1 AND source_ci_id = $2 AND target_ci_id = $3 AND relationship_type = 'calls'`,
      [tenantId, sourceCi.id, targetCi.id],
    );

    await repo.upsertRelationship(tenantId, sourceCi.id, targetCi.id, 'calls' as RelationshipType, {
      confidence,
      strength: errors > 0 && calls > 0 && errors / calls > 0.1 ? 'critical' : 'normal',
    });

    await query(
      `UPDATE relationships
       SET origin = 'trace', last_seen_at = NOW(),
           metadata = COALESCE(metadata, '{}'::jsonb) || $4::jsonb,
           ai_confidence_score = $5,
           discovered_by = 'trace'
       WHERE tenant_id = $1 AND source_ci_id = $2 AND target_ci_id = $3 AND relationship_type = 'calls'`,
      [
        tenantId,
        sourceCi.id,
        targetCi.id,
        JSON.stringify({ calls, avgLatencyMs: avgLatency, errorCount: errors, origin: 'trace' }),
        confidence,
      ],
    );

    if (!existing) relationshipsCreated += 1;
  }

  await publishAndBroadcast(tenantId, 'trace_sync', 'application', {
    edgesUpserted,
    relationshipsCreated,
    windowHours,
  });

  return { edgesUpserted, relationshipsCreated, windowHours };
}

export async function listInferredDependencies(
  tenantId: string,
  opts: { limit?: number; origin?: string } = {},
): Promise<InferredDependency[]> {
  const limit = Math.min(opts.limit ?? 200, 1000);
  const rows = opts.origin
    ? await query(
        `SELECT * FROM inferred_dependencies
         WHERE tenant_id = $1 AND origin = $2
         ORDER BY last_seen_at DESC LIMIT $3`,
        [tenantId, opts.origin, limit],
      )
    : await query(
        `SELECT * FROM inferred_dependencies
         WHERE tenant_id = $1
         ORDER BY last_seen_at DESC LIMIT $2`,
        [tenantId, limit],
      );
  return rows.map((r) => mapDep(r as Record<string, unknown>));
}
