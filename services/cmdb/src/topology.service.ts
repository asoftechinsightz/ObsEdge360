import { query, queryOne } from '@opsedge360/shared-db';
import type { TwinGraph } from '@opsedge360/shared-types';

export type TopologyType =
  | 'application'
  | 'infrastructure'
  | 'cloud'
  | 'network'
  | 'business-service';

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

function autoLayout(graph: TwinGraph): TwinGraph {
  return { nodes: [...graph.nodes], edges: [...graph.edges] };
}

export async function buildTopologyGraph(
  tenantId: string,
  topologyType: TopologyType,
): Promise<TwinGraph> {
  const typeFilter = topologyType === 'infrastructure'
    ? ['server', 'vm', 'container', 'pod', 'network_device', 'firewall', 'load_balancer']
    : topologyType === 'cloud'
      ? ['cloud_resource', 'vm']
      : topologyType === 'network'
        ? ['network_device', 'firewall', 'router', 'switch']
        : topologyType === 'business-service'
          ? ['service', 'application']
          : ['application', 'api', 'service', 'database'];

  const nodes = await query<{ id: string; name: string; ci_type: string; health_score: number; risk_score: number }>(
    `SELECT id, name, ci_type, health_score, risk_score
     FROM configuration_items
     WHERE tenant_id = $1 AND ci_type = ANY($2::text[])
     ORDER BY name
     LIMIT 500`,
    [tenantId, typeFilter],
  );

  const nodeIds = nodes.map((n) => n.id);
  const edges = nodeIds.length === 0 ? [] : await query<{
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

  return autoLayout(graph);
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
  return saveTopologySnapshot(tenantId, topologyType, graph, 'incremental');
}
