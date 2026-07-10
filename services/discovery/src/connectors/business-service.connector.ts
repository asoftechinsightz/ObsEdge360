import { query } from '@opsedge360/shared-db';
import type { DiscoveryConnector, ConnectorConfig } from './types';
import type { DiscoveredAsset } from '@opsedge360/shared-types';

export class BusinessServiceConnector implements DiscoveryConnector {
  name = 'business-service';
  protocol = 'business-service';

  async *discover(config: ConnectorConfig): AsyncGenerator<DiscoveredAsset> {
    const tenantId = config.tenantId as string;
    const tag = (config.businessTag as string) ?? 'business-service';
    if (!tenantId) return;

    const services = await query<{
      id: string;
      name: string;
      ci_type: string;
      tags: string[];
      attributes: Record<string, unknown>;
    }>(
      `SELECT id, name, ci_type, tags, attributes
       FROM configuration_items
       WHERE tenant_id = $1 AND $2 = ANY(tags)
       ORDER BY name`,
      [tenantId, tag],
    );

    for (const svc of services) {
      const members = await query<{ id: string; name: string; ci_type: string }>(
        `SELECT c.id, c.name, c.ci_type
         FROM configuration_items c
         JOIN ci_relationships r ON r.target_ci_id = c.id
         WHERE r.source_ci_id = $1 AND r.relationship_type = 'part_of'`,
        [svc.id],
      );

      yield {
        externalId: `biz://${svc.id}`,
        name: svc.name,
        ciType: 'service',
        attributes: {
          ...svc.attributes,
          memberCount: members.length,
          members: members.map((m) => ({ id: m.id, name: m.name, type: m.ci_type })),
          businessTag: tag,
        },
        aiConfidenceScore: 98,
        tags: ['business-service', tag],
        relationships: members.map((m) => ({
          targetExternalId: m.id,
          type: 'part_of' as const,
        })),
      };
    }
  }

  async healthCheck(config: ConnectorConfig): Promise<boolean> {
    return Boolean(config.tenantId);
  }
}
