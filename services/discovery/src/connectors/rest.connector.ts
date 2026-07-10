import type { DiscoveryConnector, ConnectorConfig } from './types';
import type { DiscoveredAsset } from '@opsedge360/shared-types';

interface RestEndpoint {
  url: string;
  nameField?: string;
  idField?: string;
  ciType?: string;
  headers?: Record<string, string>;
}

export class RestConnector implements DiscoveryConnector {
  name = 'rest';
  protocol = 'rest';

  async *discover(config: ConnectorConfig): AsyncGenerator<DiscoveredAsset> {
    const endpoints = (config.endpoints as RestEndpoint[]) ?? [];
    if (endpoints.length === 0) return;

    for (const ep of endpoints) {
      const res = await fetch(ep.url, {
        headers: {
          Accept: 'application/json',
          ...(ep.headers ?? {}),
        },
        signal: AbortSignal.timeout(Number(config.timeoutMs ?? 10_000)),
      });
      if (!res.ok) continue;

      const body = (await res.json()) as unknown;
      const items = Array.isArray(body) ? body : [body];

      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        const record = item as Record<string, unknown>;
        const idField = ep.idField ?? 'id';
        const nameField = ep.nameField ?? 'name';
        const externalId = String(record[idField] ?? record[nameField] ?? ep.url);
        const name = String(record[nameField] ?? externalId);
        yield {
          externalId: `rest://${externalId}`,
          name,
          ciType: (ep.ciType as DiscoveredAsset['ciType']) ?? 'application',
          attributes: { ...record, sourceUrl: ep.url, protocol: 'rest' },
          aiConfidenceScore: 90,
          tags: ['rest-discovery'],
        };
      }
    }
  }

  async healthCheck(config: ConnectorConfig): Promise<boolean> {
    const endpoints = (config.endpoints as RestEndpoint[]) ?? [];
    if (endpoints.length === 0) return false;
    try {
      const res = await fetch(endpoints[0].url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      return res.ok || res.status < 500;
    } catch {
      return false;
    }
  }
}
