import net from 'net';
import type { DiscoveryConnector, ConnectorConfig } from './types';
import type { DiscoveredAsset } from '@opsedge360/shared-types';

function expandCidr(cidr: string): string[] {
  const [base, bitsStr] = cidr.split('/');
  const bits = Number(bitsStr ?? 24);
  if (!base || Number.isNaN(bits) || bits < 8 || bits > 30) return [];
  const parts = base.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return [];
  const hostBits = 32 - bits;
  const baseInt = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  const count = Math.min(2 ** hostBits - 2, Number(configMaxHosts(hostBits)));
  const ips: string[] = [];
  for (let i = 1; i <= count; i += 1) {
    const n = (baseInt + i) >>> 0;
    ips.push(`${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`);
  }
  return ips;
}

function configMaxHosts(hostBits: number): number {
  return hostBits > 16 ? 64 : 256;
}

async function tcpProbe(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

export class NetworkConnector implements DiscoveryConnector {
  name = 'network';
  protocol = 'network';

  async *discover(config: ConnectorConfig): AsyncGenerator<DiscoveredAsset> {
    const subnets = (config.subnets as string[]) ?? [];
    const ports = (config.ports as number[]) ?? [22, 80, 443, 3389, 5432, 9090];
    const timeoutMs = Number(config.timeoutMs ?? 1500);
    const concurrency = Number(config.concurrency ?? 32);

    for (const subnet of subnets) {
      const hosts = expandCidr(subnet);
      for (let i = 0; i < hosts.length; i += concurrency) {
        const batch = hosts.slice(i, i + concurrency);
        const results = await Promise.all(
          batch.map(async (host) => {
            const openPorts: number[] = [];
            for (const port of ports) {
              if (await tcpProbe(host, port, timeoutMs)) openPorts.push(port);
            }
            return { host, openPorts };
          }),
        );
        for (const { host, openPorts } of results) {
          if (openPorts.length === 0) continue;
          yield {
            externalId: `net://${host}`,
            name: host,
            ciType: 'network_device',
            attributes: { ip: host, openPorts, subnet, protocol: 'network-scan' },
            aiConfidenceScore: 85,
            tags: ['network-discovery'],
          };
        }
      }
    }
  }

  async healthCheck(config: ConnectorConfig): Promise<boolean> {
    return Array.isArray(config.subnets) && config.subnets.length > 0;
  }
}
