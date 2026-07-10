import { query } from '@opsedge360/shared-db';
import type { DiscoveryConnector, ConnectorConfig } from './types';
import type { DiscoveredAsset, RelationshipType } from '@opsedge360/shared-types';

export class DependencyConnector implements DiscoveryConnector {
  name = 'dependency';
  protocol = 'dependency';

  async *discover(config: ConnectorConfig): AsyncGenerator<DiscoveredAsset> {
    const tenantId = config.tenantId as string;
    if (!tenantId) return;

    const rows = await query<{
      source_id: string;
      source_name: string;
      source_type: string;
      target_id: string;
      target_name: string;
      target_type: string;
      relationship_type: RelationshipType;
    }>(
      `SELECT s.id AS source_id, s.name AS source_name, s.ci_type AS source_type,
              t.id AS target_id, t.name AS target_name, t.ci_type AS target_type,
              r.relationship_type
       FROM ci_relationships r
       JOIN configuration_items s ON s.id = r.source_ci_id
       JOIN configuration_items t ON t.id = r.target_ci_id
       WHERE r.tenant_id = $1`,
      [tenantId],
    );

    const seen = new Set<string>();
    for (const row of rows) {
      const key = row.source_id;
      if (seen.has(key)) continue;
      seen.add(key);
      const deps = rows
        .filter((r) => r.source_id === row.source_id)
        .map((r) => ({ targetExternalId: r.target_id, type: r.relationship_type }));

      yield {
        externalId: `dep://${row.source_id}`,
        name: row.source_name,
        ciType: row.source_type as DiscoveredAsset['ciType'],
        attributes: {
          dependencyCount: deps.length,
          discoveryMode: 'relationship-graph',
        },
        aiConfidenceScore: 99,
        relationships: deps,
        tags: ['dependency-discovery'],
      };
    }
  }

  async healthCheck(config: ConnectorConfig): Promise<boolean> {
    return Boolean(config.tenantId);
  }
}
