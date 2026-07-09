import type { DiscoveryConnector, ConnectorConfig } from './types';
import type { DiscoveredAsset } from '@opsedge360/shared-types';

/**
 * AWS connector — discovers EC2 instances and RDS databases.
 * Phase 1: uses config inventory; real SDK integration in Phase 2.
 */
export class AwsConnector implements DiscoveryConnector {
  name = 'aws';
  protocol = 'aws';

  async *discover(config: ConnectorConfig): AsyncGenerator<DiscoveredAsset> {
    const region = (config.region as string) ?? 'ap-south-1';
    const accountId = (config.accountId as string) ?? '123456789012';

    const instances = (config.instances as Array<{ id: string; name: string; type: string }>) ?? [
      { id: 'i-0abc123def456', name: 'web-server-01', type: 'm5.xlarge' },
      { id: 'i-0def789ghi012', name: 'app-server-02', type: 'm5.large' },
    ];

    for (const inst of instances) {
      yield {
        externalId: inst.id,
        name: inst.name,
        ciType: 'vm',
        attributes: {
          provider: 'aws',
          region,
          accountId,
          instanceType: inst.type,
          platform: 'linux',
        },
        aiConfidenceScore: 97,
      };
    }

    const databases = (config.databases as Array<{ id: string; engine: string }>) ?? [
      { id: 'db-payment-primary', engine: 'postgres' },
    ];

    for (const db of databases) {
      yield {
        externalId: db.id,
        name: db.id,
        ciType: 'database',
        attributes: { provider: 'aws-rds', region, engine: db.engine, encryption_at_rest: true },
        aiConfidenceScore: 98,
      };
    }
  }

  async healthCheck(config: ConnectorConfig): Promise<boolean> {
    return !!(config.region || process.env.AWS_REGION);
  }
}
