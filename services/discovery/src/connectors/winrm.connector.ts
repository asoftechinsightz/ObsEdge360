import type { DiscoveryConnector, ConnectorConfig } from './types';
import type { DiscoveredAsset } from '@opsedge360/shared-types';

interface WinRmTarget {
  host: string;
  port?: number;
  user: string;
  password?: string;
  useSsl?: boolean;
  name?: string;
}

function buildWinRmUrl(target: WinRmTarget): string {
  const port = target.port ?? (target.useSsl ? 5986 : 5985);
  const scheme = target.useSsl ? 'https' : 'http';
  return `${scheme}://${target.host}:${port}/wsman`;
}

export class WinRmConnector implements DiscoveryConnector {
  name = 'winrm';
  protocol = 'winrm';

  async *discover(config: ConnectorConfig): AsyncGenerator<DiscoveredAsset> {
    const targets = (config.targets as WinRmTarget[]) ?? [];
    for (const target of targets) {
      const envelope = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
  xmlns:wsmid="http://schemas.dmtf.org/wbem/wsman/identity/1/wsmanidentity.xsd">
  <s:Header><wsmid:Identify/></s:Header>
  <s:Body/></s:Envelope>`;

      try {
        const auth = target.password
          ? `Basic ${Buffer.from(`${target.user}:${target.password}`).toString('base64')}`
          : undefined;
        const res = await fetch(buildWinRmUrl(target), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/soap+xml;charset=UTF-8',
            ...(auth ? { Authorization: auth } : {}),
          },
          body: envelope,
          signal: AbortSignal.timeout(Number(config.timeoutMs ?? 10_000)),
        });
        if (!res.ok) continue;

        const text = await res.text();
        const productMatch = text.match(/ProductVendor[^>]*>([^<]+)</i);
        const versionMatch = text.match(/ProductVersion[^>]*>([^<]+)</i);

        yield {
          externalId: `winrm://${target.host}`,
          name: target.name ?? target.host,
          ciType: 'server',
          attributes: {
            host: target.host,
            vendor: productMatch?.[1] ?? 'Microsoft',
            version: versionMatch?.[1] ?? 'unknown',
            protocol: 'winrm',
            wmiReady: true,
          },
          aiConfidenceScore: 92,
          tags: ['windows', 'winrm'],
        };
      } catch {
        continue;
      }
    }
  }

  async healthCheck(config: ConnectorConfig): Promise<boolean> {
    return Array.isArray(config.targets) && config.targets.length > 0;
  }
}

export class WmiConnector extends WinRmConnector {
  name = 'wmi';
  protocol = 'wmi';
}
