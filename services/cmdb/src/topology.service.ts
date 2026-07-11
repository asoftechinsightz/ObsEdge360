import { query, queryOne } from '@opsedge360/shared-db';
import type { TwinGraph } from '@opsedge360/shared-types';
import { computeLayout, ciTypeToLayer, type LayoutAlgorithm } from './layout-engine';
import { publishAndBroadcast } from './topology-events';

export type TopologyType =
  | 'application'
  | 'infrastructure'
  | 'cloud'
  | 'network'
  | 'business-service'
  | 'kubernetes'
  | 'service';

export interface TopologySnapshot {
  id: string;
  tenant_id: string;
  topology_type: TopologyType;
  version: number;
  graph: TwinGraph;
  node_count: number;
  edge_count: number;
  layout_algorithm: string;
  created_at: string;
}

export const TOPOLOGY_LAYERS = [
  { id: 'business', label: 'Business Service', types: ['business_service', 'service', 'application'] },
  { id: 'application', label: 'Application', types: ['application', 'api', 'service'] },
  { id: 'service', label: 'Service', types: ['service', 'database', 'middleware', 'queue', 'cache'] },
  { id: 'k8s', label: 'Kubernetes', types: ['k8s_object', 'pod', 'container', 'cluster'] },
  { id: 'infrastructure', label: 'Infrastructure', types: ['server', 'vm', 'storage', 'cluster'] },
  { id: 'cloud', label: 'Cloud', types: ['cloud_resource', 'vm', 'storage', 'cluster'] },
  { id: 'network', label: 'Network', types: ['network_device', 'firewall', 'load_balancer'] },
] as const;

function typeFilterFor(topologyType: TopologyType): string[] {
  switch (topologyType) {
    case 'infrastructure':
      return ['server', 'vm', 'container', 'pod', 'network_device', 'firewall', 'load_balancer', 'cluster', 'storage'];
    case 'cloud':
      return ['cloud_resource', 'vm', 'storage', 'cluster'];
    case 'network':
      return ['network_device', 'firewall', 'load_balancer'];
    case 'business-service':
      return ['service', 'application', 'business_service'];
    case 'kubernetes':
      return ['k8s_object', 'pod', 'container', 'cluster'];
    case 'service':
      return ['service', 'api', 'database', 'middleware', 'queue', 'cache', 'application'];
    default:
      return ['application', 'api', 'service', 'database', 'middleware', 'queue', 'cache', 'k8s_object'];
  }
}

function applyLayoutToGraph(
  graph: TwinGraph,
  positions: Map<string, { x: number; y: number }>,
): TwinGraph {
  return {
    nodes: graph.nodes.map((n) => {
      const p = positions.get(n.id);
      return {
        ...n,
        ...(p ? { x: p.x, y: p.y } : {}),
      } as TwinGraph['nodes'][0] & { x?: number; y?: number };
    }),
    edges: [...graph.edges],
  };
}

export async function buildTopologyGraph(
  tenantId: string,
  topologyType: TopologyType,
): Promise<TwinGraph> {
  const typeFilter = typeFilterFor(topologyType);

  const nodes = await query<{
    id: string;
    name: string;
    ci_type: string;
    health_score: number;
    risk_score: number;
  }>(
    `SELECT id, name, ci_type, health_score, risk_score
     FROM configuration_items
     WHERE tenant_id = $1 AND ci_type::text = ANY($2::text[])
     ORDER BY name
     LIMIT 500`,
    [tenantId, typeFilter],
  );

  const nodeIds = nodes.map((n) => n.id);
  const edges =
    nodeIds.length === 0
      ? []
      : await query<{
          source_ci_id: string;
          target_ci_id: string;
          relationship_type: string;
        }>(
          `SELECT source_ci_id, target_ci_id, relationship_type
           FROM ci_relationships
           WHERE tenant_id = $1
             AND source_ci_id = ANY($2::uuid[])
             AND target_ci_id = ANY($2::uuid[])`,
          [tenantId, nodeIds],
        );

  const graph: TwinGraph = {
    nodes: nodes.map((n) => ({
      id: n.id,
      label: n.name,
      type: n.ci_type as TwinGraph['nodes'][0]['type'],
      healthScore: n.health_score,
      riskScore: n.risk_score,
    })),
    edges: edges.map((e) => ({
      source: e.source_ci_id,
      target: e.target_ci_id,
      type: e.relationship_type as TwinGraph['edges'][0]['type'],
    })),
  };

  const positions = computeLayout(
    graph.nodes.map((n) => ({ id: n.id, layer: ciTypeToLayer(n.type) })),
    graph.edges.map((e) => ({ source: e.source, target: e.target })),
    'force-directed',
  );
  return applyLayoutToGraph(graph, positions);
}

export async function saveTopologySnapshot(
  tenantId: string,
  topologyType: TopologyType,
  graph: TwinGraph,
  layoutAlgorithm = 'force-directed',
): Promise<TopologySnapshot> {
  const latest = await queryOne<{ version: number }>(
    `SELECT COALESCE(MAX(version), 0) AS version
     FROM topology_snapshots
     WHERE tenant_id = $1 AND topology_type = $2`,
    [tenantId, topologyType],
  );
  const version = (latest?.version ?? 0) + 1;

  const row = await queryOne<TopologySnapshot>(
    `INSERT INTO topology_snapshots
      (tenant_id, topology_type, version, graph, node_count, edge_count, layout_algorithm)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      tenantId,
      topologyType,
      version,
      JSON.stringify(graph),
      graph.nodes.length,
      graph.edges.length,
      layoutAlgorithm,
    ],
  );
  if (!row) throw new Error('Failed to save topology snapshot');
  try {
    const engine = await import('./relationship-engine');
    await engine.materializeTopologyGraph(tenantId, topologyType, row.id, graph as unknown as {
      nodes?: Array<Record<string, unknown>>;
      edges?: Array<Record<string, unknown>>;
    });
  } catch (err) {
    console.warn('[cmdb] topology materialize skipped:', (err as Error).message);
  }

  await publishAndBroadcast(tenantId, 'topology_refreshed', topologyType, {
    snapshotId: row.id,
    version,
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
  });

  return row;
}

export async function getLatestTopology(
  tenantId: string,
  topologyType: TopologyType,
): Promise<TopologySnapshot | null> {
  return queryOne<TopologySnapshot>(
    `SELECT * FROM topology_snapshots
     WHERE tenant_id = $1 AND topology_type = $2
     ORDER BY version DESC
     LIMIT 1`,
    [tenantId, topologyType],
  );
}

export async function incrementalRefresh(
  tenantId: string,
  topologyType: TopologyType,
): Promise<TopologySnapshot> {
  const graph = await buildTopologyGraph(tenantId, topologyType);
  return saveTopologySnapshot(tenantId, topologyType, graph, 'force-directed');
}

export async function applyAndPersistLayout(
  tenantId: string,
  topologyType: TopologyType,
  algorithm: LayoutAlgorithm = 'force-directed',
): Promise<TopologySnapshot> {
  const latest = await getLatestTopology(tenantId, topologyType);
  const base = latest?.graph
    ? (typeof latest.graph === 'string' ? JSON.parse(latest.graph as unknown as string) : latest.graph)
    : await buildTopologyGraph(tenantId, topologyType);

  const graph = base as TwinGraph;
  const positions = computeLayout(
    graph.nodes.map((n) => ({
      id: n.id,
      layer: ciTypeToLayer(String(n.type)),
    })),
    graph.edges.map((e) => ({ source: e.source, target: e.target })),
    algorithm,
  );
  const laidOut = applyLayoutToGraph(graph, positions);

  for (const [nodeKey, pos] of positions) {
    await query(
      `INSERT INTO topology_layout_positions
        (tenant_id, topology_type, snapshot_id, node_key, layout_algorithm, x, y, layer, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
       ON CONFLICT (tenant_id, topology_type, node_key, layout_algorithm)
       DO UPDATE SET x = EXCLUDED.x, y = EXCLUDED.y, layer = EXCLUDED.layer,
         snapshot_id = EXCLUDED.snapshot_id, updated_at = NOW()`,
      [
        tenantId,
        topologyType,
        latest?.id ?? null,
        nodeKey,
        algorithm,
        pos.x,
        pos.y,
        ciTypeToLayer(String(graph.nodes.find((n) => n.id === nodeKey)?.type ?? 'service')),
      ],
    );
  }

  return saveTopologySnapshot(tenantId, topologyType, laidOut, algorithm);
}

export async function listLayerStats(tenantId: string) {
  const counts = await query<{ ci_type: string; count: string }>(
    `SELECT ci_type::text as ci_type, COUNT(*)::text as count
     FROM configuration_items WHERE tenant_id = $1
     GROUP BY ci_type`,
    [tenantId],
  );
  const byType = new Map(counts.map((c) => [c.ci_type, Number(c.count)]));
  return TOPOLOGY_LAYERS.map((layer) => ({
    id: layer.id,
    label: layer.label,
    types: [...layer.types],
    nodeCount: layer.types.reduce((sum, t) => sum + (byType.get(t) ?? 0), 0),
  }));
}
