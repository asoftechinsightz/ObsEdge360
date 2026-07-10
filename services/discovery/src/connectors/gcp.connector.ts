import type { DiscoveryConnector, ConnectorConfig } from './types';
import type { DiscoveredAsset } from '@opsedge360/shared-types';

interface GcpConfig {
  projectId: string;
  accessToken: string;
}

export class GcpConnector implements DiscoveryConnector {
  name = 'gcp';
  protocol = 'gcp';

  async *discover(config: ConnectorConfig): AsyncGenerator<DiscoveredAsset> {
    const gcp = config as unknown as GcpConfig;
    if (!gcp.projectId || !gcp.accessToken) return;

    const url = `https://compute.googleapis.com/compute/v1/projects/${gcp.projectId}/aggregated/instances`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${gcp.accessToken}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return;

    const data = (await res.json()) as {
      items?: Record<string, { instances?: Array<{ id: string; name: string; zone?: string; status?: string }> }>;
    };

    for (const zoneData of Object.values(data.items ?? {})) {
      for (const inst of zoneData.instances ?? []) {
        yield {
          externalId: `gcp://${gcp.projectId}/${inst.id}`,
          name: inst.name,
          ciType: 'vm',
          attributes: {
            projectId: gcp.projectId,
            zone: inst.zone,
            status: inst.status,
            provider: 'gcp',
          },
          aiConfidenceScore: 97,
          tags: ['gcp', 'cloud'],
        };
      }
    }
  }

  async healthCheck(config: ConnectorConfig): Promise<boolean> {
    const gcp = config as unknown as GcpConfig;
    return Boolean(gcp.projectId && gcp.accessToken);
  }
}
