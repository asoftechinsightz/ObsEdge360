import neo4j, { type Driver } from 'neo4j-driver';
import type { ConfigurationItem, Relationship } from '@opsedge360/shared-types';

let driver: Driver | null = null;

function getDriver(): Driver | null {
  if (process.env.NEO4J_ENABLED === 'false') return null;
  if (!driver) {
    try {
      driver = neo4j.driver(
        process.env.NEO4J_URI ?? 'bolt://localhost:7687',
        neo4j.auth.basic(
          process.env.NEO4J_USER ?? 'neo4j',
          process.env.NEO4J_PASSWORD ?? 'trinetra_dev',
        ),
      );
    } catch (err) {
      console.warn('[graph-sync] Neo4j unavailable:', (err as Error).message);
      return null;
    }
  }
  return driver;
}

export async function syncCiToGraph(ci: ConfigurationItem): Promise<void> {
  const d = getDriver();
  if (!d) return;

  const session = d.session();
  try {
    await session.run(
      `MERGE (n:ConfigurationItem {ci_id: $ciId, tenant_id: $tenantId})
       SET n.name = $name, n.ci_type = $ciType, n.health_score = $healthScore,
           n.risk_score = $riskScore, n.status = $status, n.updated_at = datetime()`,
      {
        ciId: ci.id,
        tenantId: ci.tenantId,
        name: ci.name,
        ciType: ci.ciType,
        healthScore: ci.healthScore,
        riskScore: ci.riskScore,
        status: ci.status,
      },
    );
  } finally {
    await session.close();
  }
}

export async function syncRelationshipToGraph(rel: Relationship): Promise<void> {
  const d = getDriver();
  if (!d) return;

  const relType = rel.relationshipType.toUpperCase().replace(/-/g, '_');
  const session = d.session();
  try {
    await session.run(
      `MATCH (a:ConfigurationItem {ci_id: $sourceId, tenant_id: $tenantId})
       MATCH (b:ConfigurationItem {ci_id: $targetId, tenant_id: $tenantId})
       MERGE (a)-[r:${relType}]->(b)
       SET r.strength = $strength, r.confidence = $confidence`,
      {
        sourceId: rel.sourceCiId,
        targetId: rel.targetCiId,
        tenantId: rel.tenantId,
        strength: rel.strength,
        confidence: rel.aiConfidenceScore,
      },
    );
  } finally {
    await session.close();
  }
}

export async function getImpactFromGraph(tenantId: string, ciId: string) {
  const d = getDriver();
  if (!d) {
    return { affectedCis: 0, ciIds: [] as string[] };
  }

  const session = d.session();
  try {
    const result = await session.run(
      `MATCH (root:ConfigurationItem {ci_id: $ciId, tenant_id: $tenantId})
       OPTIONAL MATCH (root)-[:DEPENDS_ON|RUNS_ON|CONNECTS_TO|CALLS*1..3]->(affected)
       RETURN collect(DISTINCT affected.ci_id) as affectedIds`,
      { ciId, tenantId },
    );
    const ids = (result.records[0]?.get('affectedIds') as string[] | null)?.filter(Boolean) ?? [];
    return { affectedCis: ids.length, ciIds: ids };
  } finally {
    await session.close();
  }
}

export async function closeGraph(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
