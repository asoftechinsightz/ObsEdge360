import type { DiscoveryConnector, ConnectorConfig } from './types';
import type { DiscoveredAsset } from '@opsedge360/shared-types';

/** Demo connector — simulates IT infrastructure discovery for Phase 1 */
export class StaticConnector implements DiscoveryConnector {
  name = 'static-demo';
  protocol = 'static';

  async *discover(config: ConnectorConfig): AsyncGenerator<DiscoveredAsset> {
    const prefix = (config.prefix as string) ?? 'demo';
    const assets: DiscoveredAsset[] = [
      {
        externalId: `${prefix}-web-01`,
        name: `${prefix}-web-server-01`,
        ciType: 'server',
        attributes: { os: 'RHEL 9', ip: '10.0.1.5', cpu_cores: 16, memory_gb: 64 },
        aiConfidenceScore: 96,
        tags: ['production', 'web'],
      },
      {
        externalId: `${prefix}-db-primary`,
        name: `${prefix}-payment-db-primary`,
        ciType: 'database',
        attributes: { engine: 'PostgreSQL 16', encryption_at_rest: true, port: 5432 },
        aiConfidenceScore: 99,
        tags: ['production', 'payments', 'tier-1'],
      },
      {
        externalId: `${prefix}-payment-api`,
        name: `${prefix}-payment-api`,
        ciType: 'api',
        attributes: { framework: 'NestJS', replicas: 3, port: 8080 },
        aiConfidenceScore: 94,
        relationships: [
          { targetExternalId: `${prefix}-db-primary`, type: 'depends_on' },
        ],
      },
      {
        externalId: `${prefix}-k8s-prod`,
        name: `${prefix}-k8s-prod-cluster`,
        ciType: 'cloud_resource',
        attributes: { provider: 'aws', region: 'ap-south-1', version: '1.29' },
        aiConfidenceScore: 98,
        relationships: [
          { targetExternalId: `${prefix}-payment-api`, type: 'runs_on' },
        ],
      },
      {
        externalId: `${prefix}-fw-edge`,
        name: `${prefix}-fw-edge-01`,
        ciType: 'firewall',
        attributes: { vendor: 'Palo Alto', model: 'PA-5220' },
        aiConfidenceScore: 97,
        relationships: [
          { targetExternalId: `${prefix}-web-01`, type: 'secures' },
        ],
      },
    ];

    for (const asset of assets) {
      yield asset;
    }
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
