import type { DiscoveryConnector, ConnectorConfig } from './types';
import type { DiscoveredAsset } from '@opsedge360/shared-types';

interface AzureConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  subscriptionId: string;
}

async function fetchAzureToken(cfg: AzureConfig): Promise<string | null> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    scope: 'https://management.azure.com/.default',
  });
  const res = await fetch(
    `https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

export class AzureConnector implements DiscoveryConnector {
  name = 'azure';
  protocol = 'azure';

  async *discover(config: ConnectorConfig): AsyncGenerator<DiscoveredAsset> {
    const azure = config as unknown as AzureConfig;
    if (!azure.subscriptionId || !azure.clientId || !azure.clientSecret || !azure.tenantId) return;

    const token = await fetchAzureToken(azure);
    if (!token) return;

    const url = `https://management.azure.com/subscriptions/${azure.subscriptionId}/resources?api-version=2021-04-01`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return;

    const data = (await res.json()) as {
      value?: Array<{ id: string; name: string; type: string; location?: string }>;
    };

    for (const resource of data.value ?? []) {
      const ciType = mapAzureType(resource.type);
      yield {
        externalId: resource.id,
        name: resource.name,
        ciType,
        attributes: {
          azureType: resource.type,
          location: resource.location,
          subscriptionId: azure.subscriptionId,
          provider: 'azure',
        },
        aiConfidenceScore: 97,
        tags: ['azure', 'cloud'],
      };
    }
  }

  async healthCheck(config: ConnectorConfig): Promise<boolean> {
    const c = config as unknown as AzureConfig;
    return Boolean(c.subscriptionId && c.clientId && c.clientSecret);
  }
}

function mapAzureType(azureType: string): DiscoveredAsset['ciType'] {
  if (azureType.includes('virtualMachines')) return 'vm';
  if (azureType.includes('database')) return 'database';
  if (azureType.includes('loadBalancers')) return 'load_balancer';
  if (azureType.includes('kubernetes')) return 'cloud_resource';
  return 'cloud_resource';
}
