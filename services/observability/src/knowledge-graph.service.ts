import { query, queryOne } from '@opsedge360/shared-db';

async function upsertEntity(
  tenantId: string,
  entityType: string,
  sourceTable: string,
  sourceId: string,
  label: string,
  attrs: Record<string, unknown> = {},
): Promise<string> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO kg_entities (tenant_id, entity_type, source_table, source_id, label, attrs, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW())
     ON CONFLICT (tenant_id, source_table, source_id)
     DO UPDATE SET label = EXCLUDED.label, attrs = EXCLUDED.attrs, entity_type = EXCLUDED.entity_type,
       updated_at = NOW()
     RETURNING id`,
    [tenantId, entityType, sourceTable, sourceId, label.slice(0, 500), JSON.stringify(attrs)],
  );
  return String(row!.id);
}

async function upsertEdge(
  tenantId: string,
  fromId: string,
  toId: string,
  edgeType: string,
  weight = 1,
  confidence = 1,
  evidence: Record<string, unknown> = {},
) {
  if (!fromId || !toId || fromId === toId) return;
  await query(
    `INSERT INTO kg_edges (tenant_id, from_entity_id, to_entity_id, edge_type, weight, confidence, evidence)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (tenant_id, from_entity_id, to_entity_id, edge_type)
     DO UPDATE SET weight = EXCLUDED.weight, confidence = EXCLUDED.confidence, evidence = EXCLUDED.evidence`,
    [tenantId, fromId, toId, edgeType, weight, confidence, JSON.stringify(evidence)],
  );
}

/**
 * Materialize tenant ops knowledge graph from CMDB + ops evidence tables.
 */
export async function syncKnowledgeGraph(tenantId: string) {
  const started = new Date().toISOString();
  let entities = 0;
  let edges = 0;
  const counts: Record<string, number> = {};

  // CIs
  const cis = await query<Record<string, unknown>>(
    `SELECT id, name, ci_type, status, health_score, external_id
     FROM configuration_items WHERE tenant_id = $1
     ORDER BY updated_at DESC NULLS LAST LIMIT 500`,
    [tenantId],
  ).catch(() => [] as Record<string, unknown>[]);
  const ciMap = new Map<string, string>();
  for (const ci of cis) {
    const id = await upsertEntity(tenantId, 'ci', 'configuration_items', String(ci.id), String(ci.name), {
      ciType: ci.ci_type,
      status: ci.status,
      healthScore: ci.health_score,
      externalId: ci.external_id,
    });
    ciMap.set(String(ci.id), id);
    entities += 1;
  }
  counts.ci = cis.length;

  // CMDB relationships
  const rels = await query<Record<string, unknown>>(
    `SELECT source_ci_id, target_ci_id, relationship_type, strength, ai_confidence_score
     FROM relationships WHERE tenant_id = $1 LIMIT 2000`,
    [tenantId],
  ).catch(() => [] as Record<string, unknown>[]);
  for (const r of rels) {
    const fromId = ciMap.get(String(r.source_ci_id));
    const toId = ciMap.get(String(r.target_ci_id));
    if (!fromId || !toId) continue;
    await upsertEdge(
      tenantId,
      fromId,
      toId,
      String(r.relationship_type || 'related_to'),
      typeof r.strength === 'number' ? Number(r.strength) : 1,
      Number(r.ai_confidence_score ?? 80) / 100,
      { origin: 'cmdb_relationships' },
    );
    edges += 1;
  }
  counts.relationships = rels.length;

  // Inferred dependencies (optional)
  const inferred = await query<Record<string, unknown>>(
    `SELECT source_ci_id, target_ci_id, relationship_type, confidence, source_service, target_service
     FROM inferred_dependencies WHERE tenant_id = $1 LIMIT 1000`,
    [tenantId],
  ).catch(() => [] as Record<string, unknown>[]);
  for (const d of inferred) {
    let fromId = d.source_ci_id ? ciMap.get(String(d.source_ci_id)) : undefined;
    let toId = d.target_ci_id ? ciMap.get(String(d.target_ci_id)) : undefined;
    if (!fromId && d.source_service) {
      fromId = await upsertEntity(
        tenantId,
        'service',
        'inferred_service',
        `svc:${d.source_service}`,
        String(d.source_service),
        {},
      );
      entities += 1;
    }
    if (!toId && d.target_service) {
      toId = await upsertEntity(
        tenantId,
        'service',
        'inferred_service',
        `svc:${d.target_service}`,
        String(d.target_service),
        {},
      );
      entities += 1;
    }
    if (fromId && toId) {
      await upsertEdge(
        tenantId,
        fromId,
        toId,
        String(d.relationship_type || 'calls'),
        1,
        Number(d.confidence ?? 0.7),
        { origin: 'inferred_dependencies' },
      );
      edges += 1;
    }
  }
  counts.inferred = inferred.length;

  // Incidents
  const incidents = await query<Record<string, unknown>>(
    `SELECT id, title, severity, status, primary_ci_id FROM ops_incidents
     WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [tenantId],
  ).catch(() => [] as Record<string, unknown>[]);
  for (const inc of incidents) {
    const eid = await upsertEntity(
      tenantId,
      'incident',
      'ops_incidents',
      String(inc.id),
      String(inc.title),
      { severity: inc.severity, status: inc.status },
    );
    entities += 1;
    if (inc.primary_ci_id && ciMap.has(String(inc.primary_ci_id))) {
      await upsertEdge(tenantId, eid, ciMap.get(String(inc.primary_ci_id))!, 'affects', 1.2, 1, {
        origin: 'ops_incidents',
      });
      edges += 1;
    }
  }
  counts.incidents = incidents.length;

  // Incident CI links
  const links = await query<Record<string, unknown>>(
    `SELECT incident_id, ci_id, link_reason FROM ops_incident_ci_links WHERE tenant_id = $1 LIMIT 500`,
    [tenantId],
  ).catch(() => [] as Record<string, unknown>[]);
  for (const l of links) {
    const incEnt = await queryOne<{ id: string }>(
      `SELECT id FROM kg_entities WHERE tenant_id = $1 AND source_table = 'ops_incidents' AND source_id = $2`,
      [tenantId, String(l.incident_id)],
    );
    const ciEnt = ciMap.get(String(l.ci_id));
    if (incEnt && ciEnt) {
      await upsertEdge(tenantId, incEnt.id, ciEnt, String(l.link_reason || 'linked_to'), 1, 1, {
        origin: 'ops_incident_ci_links',
      });
      edges += 1;
    }
  }

  // Anomalies
  const anomalies = await query<Record<string, unknown>>(
    `SELECT id, anomaly_type, metric_name, severity, ci_id, status
     FROM anomalies WHERE tenant_id = $1 ORDER BY detected_at DESC LIMIT 100`,
    [tenantId],
  ).catch(() => [] as Record<string, unknown>[]);
  for (const a of anomalies) {
    const label = `${a.anomaly_type}${a.metric_name ? `: ${a.metric_name}` : ''}`;
    const eid = await upsertEntity(tenantId, 'anomaly', 'anomalies', String(a.id), label, {
      severity: a.severity,
      status: a.status,
      metric: a.metric_name,
    });
    entities += 1;
    if (a.ci_id && ciMap.has(String(a.ci_id))) {
      await upsertEdge(tenantId, eid, ciMap.get(String(a.ci_id))!, 'observed_on', 1.1, 1, {
        origin: 'anomalies',
      });
      edges += 1;
    }
  }
  counts.anomalies = anomalies.length;

  // Capacity forecasts with breach
  const forecasts = await query<Record<string, unknown>>(
    `SELECT id, metric_name, forecast_type, breach_eta, model_version
     FROM predictive_forecasts WHERE tenant_id = $1 ORDER BY generated_at DESC LIMIT 80`,
    [tenantId],
  ).catch(() => [] as Record<string, unknown>[]);
  for (const f of forecasts) {
    const eid = await upsertEntity(
      tenantId,
      'forecast',
      'predictive_forecasts',
      String(f.id),
      `Forecast ${f.forecast_type}: ${f.metric_name}`,
      { breachEta: f.breach_eta, model: f.model_version },
    );
    entities += 1;
    // soft-link by metric name token to CI name
    const token = String(f.metric_name || '').split(/[_\-.]/)[0];
    if (token) {
      const ciRow = await queryOne<{ id: string }>(
        `SELECT id FROM kg_entities
         WHERE tenant_id = $1 AND entity_type = 'ci' AND lower(label) LIKE lower($2)
         LIMIT 1`,
        [tenantId, `%${token}%`],
      );
      if (ciRow) {
        await upsertEdge(tenantId, eid, ciRow.id, 'forecasts_for', 0.9, 0.8, {
          origin: 'predictive_forecasts',
        });
        edges += 1;
      }
    }
  }
  counts.forecasts = forecasts.length;

  // Correlations
  const corrs = await query<Record<string, unknown>>(
    `SELECT id, title, severity, primary_ci_id, primary_service
     FROM aiops_correlation_events WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [tenantId],
  ).catch(() => [] as Record<string, unknown>[]);
  for (const c of corrs) {
    const eid = await upsertEntity(
      tenantId,
      'correlation',
      'aiops_correlation_events',
      String(c.id),
      String(c.title),
      { severity: c.severity, service: c.primary_service },
    );
    entities += 1;
    if (c.primary_ci_id && ciMap.has(String(c.primary_ci_id))) {
      await upsertEdge(tenantId, eid, ciMap.get(String(c.primary_ci_id))!, 'correlates', 1.2, 1, {
        origin: 'aiops_correlation_events',
      });
      edges += 1;
    }
  }
  counts.correlations = corrs.length;

  // Remediation requests
  const rems = await query<Record<string, unknown>>(
    `SELECT id, action, status, risk_tier, incident_id, execution_mode
     FROM ops_remediation_requests WHERE tenant_id = $1 ORDER BY requested_at DESC LIMIT 50`,
    [tenantId],
  ).catch(() => [] as Record<string, unknown>[]);
  for (const r of rems) {
    const eid = await upsertEntity(
      tenantId,
      'remediation',
      'ops_remediation_requests',
      String(r.id),
      String(r.action).slice(0, 500),
      { status: r.status, riskTier: r.risk_tier, mode: r.execution_mode },
    );
    entities += 1;
    if (r.incident_id) {
      const incEnt = await queryOne<{ id: string }>(
        `SELECT id FROM kg_entities WHERE tenant_id = $1 AND source_table = 'ops_incidents' AND source_id = $2`,
        [tenantId, String(r.incident_id)],
      );
      if (incEnt) {
        await upsertEdge(tenantId, eid, incEnt.id, 'remediates', 1, 1, {
          origin: 'ops_remediation_requests',
        });
        edges += 1;
      }
    }
  }
  counts.remediations = rems.length;

  const run = await queryOne<Record<string, unknown>>(
    `INSERT INTO kg_sync_runs
      (tenant_id, entities_upserted, edges_upserted, status, summary, started_at, completed_at)
     VALUES ($1,$2,$3,'completed',$4,$5,NOW())
     RETURNING *`,
    [tenantId, entities, edges, JSON.stringify({ counts, started }), started],
  );

  return {
    runId: run?.id,
    entitiesUpserted: entities,
    edgesUpserted: edges,
    counts,
  };
}

export async function getNeighborhood(
  tenantId: string,
  opts: { entityId?: string; q?: string; depth?: number; limit?: number } = {},
) {
  const depth = Math.min(Math.max(opts.depth ?? 2, 1), 3);
  const limit = Math.min(opts.limit ?? 40, 100);

  let root = opts.entityId
    ? await queryOne<Record<string, unknown>>(
        `SELECT * FROM kg_entities WHERE tenant_id = $1 AND id = $2`,
        [tenantId, opts.entityId],
      )
    : null;

  if (!root && opts.q?.trim()) {
    root = await queryOne<Record<string, unknown>>(
      `SELECT * FROM kg_entities
       WHERE tenant_id = $1 AND (
         lower(label) LIKE lower($2) OR attrs::text ILIKE $2 OR source_id = $3
       )
       ORDER BY updated_at DESC LIMIT 1`,
      [tenantId, `%${opts.q.trim().slice(0, 80)}%`, opts.q.trim()],
    );
  }

  if (!root) {
    const sample = await query(
      `SELECT * FROM kg_entities WHERE tenant_id = $1 ORDER BY updated_at DESC LIMIT $2`,
      [tenantId, Math.min(limit, 20)],
    );
    return { root: null, nodes: sample, edges: [], depth: 0 };
  }

  const nodeMap = new Map<string, Record<string, unknown>>();
  nodeMap.set(String(root.id), root);
  let frontier = [String(root.id)];

  for (let d = 0; d < depth; d++) {
    if (!frontier.length) break;
    const edgeRows = await query<Record<string, unknown>>(
      `SELECT * FROM kg_edges
       WHERE tenant_id = $1 AND (from_entity_id = ANY($2::uuid[]) OR to_entity_id = ANY($2::uuid[]))
       LIMIT $3`,
      [tenantId, frontier, limit * 2],
    );
    const nextIds: string[] = [];
    for (const e of edgeRows) {
      nextIds.push(String(e.from_entity_id), String(e.to_entity_id));
    }
    const unique = [...new Set(nextIds)].filter((id) => !nodeMap.has(id));
    if (unique.length) {
      const nodes = await query<Record<string, unknown>>(
        `SELECT * FROM kg_entities WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
        [tenantId, unique],
      );
      for (const n of nodes) nodeMap.set(String(n.id), n);
    }
    frontier = unique;
  }

  const nodeIds = [...nodeMap.keys()];
  const edges = await query(
    `SELECT * FROM kg_edges
     WHERE tenant_id = $1 AND from_entity_id = ANY($2::uuid[]) AND to_entity_id = ANY($2::uuid[])
     LIMIT $3`,
    [tenantId, nodeIds, limit * 3],
  );

  return {
    root: {
      id: root.id,
      entityType: root.entity_type,
      label: root.label,
      sourceTable: root.source_table,
      sourceId: root.source_id,
      attrs: root.attrs,
    },
    nodes: [...nodeMap.values()].slice(0, limit).map((n) => ({
      id: n.id,
      entityType: n.entity_type,
      label: n.label,
      sourceTable: n.source_table,
      sourceId: n.source_id,
      attrs: n.attrs,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      from: e.from_entity_id,
      to: e.to_entity_id,
      edgeType: e.edge_type,
      weight: e.weight,
      confidence: e.confidence,
    })),
    depth,
  };
}

export async function graphCitations(
  tenantId: string,
  question: string,
  limit = 8,
): Promise<
  Array<{
    chunkId: string;
    documentId: string;
    title: string;
    content: string;
    rank: number;
    sourceType: string;
  }>
> {
  const neighborhood = await getNeighborhood(tenantId, { q: question, depth: 2, limit: 30 });
  const cites: Array<{
    chunkId: string;
    documentId: string;
    title: string;
    content: string;
    rank: number;
    sourceType: string;
  }> = [];

  if (neighborhood.root) {
    cites.push({
      chunkId: String(neighborhood.root.id),
      documentId: String(neighborhood.root.id),
      title: `KG: ${neighborhood.root.label}`,
      content: `Entity ${neighborhood.root.entityType} · ${neighborhood.root.label} · attrs ${JSON.stringify(neighborhood.root.attrs ?? {}).slice(0, 300)}`,
      rank: 1,
      sourceType: 'knowledge_graph',
    });
  }

  for (const n of neighborhood.nodes.slice(0, limit)) {
    if (neighborhood.root && n.id === neighborhood.root.id) continue;
    cites.push({
      chunkId: String(n.id),
      documentId: String(n.id),
      title: `KG: ${n.label}`,
      content: `${n.entityType} · ${n.label} · ${JSON.stringify(n.attrs ?? {}).slice(0, 280)}`,
      rank: 0.8,
      sourceType: 'knowledge_graph',
    });
  }

  for (const e of neighborhood.edges.slice(0, 5)) {
    cites.push({
      chunkId: String(e.id),
      documentId: String(e.id),
      title: `KG edge: ${e.edgeType}`,
      content: `${e.from} -[${e.edgeType}]-> ${e.to} (w=${e.weight}, c=${e.confidence})`,
      rank: 0.6,
      sourceType: 'knowledge_graph',
    });
  }

  return cites.slice(0, limit);
}

export async function latestSync(tenantId: string) {
  return queryOne(
    `SELECT * FROM kg_sync_runs WHERE tenant_id = $1 ORDER BY started_at DESC LIMIT 1`,
    [tenantId],
  );
}

export async function graphStats(tenantId: string) {
  const row = await queryOne<{ entities: string; edges: string }>(
    `SELECT
      (SELECT COUNT(*)::text FROM kg_entities WHERE tenant_id = $1) as entities,
      (SELECT COUNT(*)::text FROM kg_edges WHERE tenant_id = $1) as edges`,
    [tenantId],
  );
  return {
    entities: Number(row?.entities ?? 0),
    edges: Number(row?.edges ?? 0),
  };
}

/* Conversations */

export async function createConversation(
  tenantId: string,
  opts: { title?: string; createdBy?: string } = {},
) {
  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO ai_conversation_sessions (tenant_id, title, created_by)
     VALUES ($1,$2,$3) RETURNING *`,
    [tenantId, opts.title ?? 'Ops Copilot', opts.createdBy ?? null],
  );
  return {
    id: row!.id,
    title: row!.title,
    createdAt: row!.created_at,
  };
}

export async function getConversation(tenantId: string, sessionId: string) {
  const session = await queryOne<Record<string, unknown>>(
    `SELECT * FROM ai_conversation_sessions WHERE tenant_id = $1 AND id = $2`,
    [tenantId, sessionId],
  );
  if (!session) return null;
  const messages = await query(
    `SELECT id, role, content, citations, model, provider, mode, created_at
     FROM ai_conversation_messages
     WHERE tenant_id = $1 AND session_id = $2
     ORDER BY created_at ASC LIMIT 100`,
    [tenantId, sessionId],
  );
  return {
    id: session.id,
    title: session.title,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    messages,
  };
}

export async function listConversations(tenantId: string, limit = 20) {
  return query(
    `SELECT id, title, created_by, created_at, updated_at
     FROM ai_conversation_sessions WHERE tenant_id = $1
     ORDER BY updated_at DESC LIMIT $2`,
    [tenantId, Math.min(limit, 50)],
  );
}

export async function appendMessage(
  tenantId: string,
  sessionId: string,
  msg: {
    role: string;
    content: string;
    citations?: unknown;
    model?: string;
    provider?: string;
    mode?: string;
  },
) {
  const session = await queryOne(
    `SELECT id FROM ai_conversation_sessions WHERE tenant_id = $1 AND id = $2`,
    [tenantId, sessionId],
  );
  if (!session) throw new Error('Conversation not found');

  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO ai_conversation_messages
      (tenant_id, session_id, role, content, citations, model, provider, mode)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      tenantId,
      sessionId,
      msg.role,
      msg.content,
      JSON.stringify(msg.citations ?? []),
      msg.model ?? null,
      msg.provider ?? null,
      msg.mode ?? null,
    ],
  );
  await query(
    `UPDATE ai_conversation_sessions SET updated_at = NOW() WHERE tenant_id = $1 AND id = $2`,
    [tenantId, sessionId],
  );
  return row;
}

export async function recentConversationContext(tenantId: string, sessionId: string, limit = 6) {
  return query<{ role: string; content: string }>(
    `SELECT role, content FROM ai_conversation_messages
     WHERE tenant_id = $1 AND session_id = $2
     ORDER BY created_at DESC LIMIT $3`,
    [tenantId, sessionId, Math.min(limit, 20)],
  ).then((rows) => rows.reverse());
}
