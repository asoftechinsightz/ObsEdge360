import type { DiscoveryConnector, ConnectorConfig } from './types';
import type { CiType, DiscoveredAsset } from '@opsedge360/shared-types';
import net from 'net';

const MIDDLEWARE_CI: Record<string, CiType> = {
  kafka: 'queue',
  rabbitmq: 'queue',
  nginx: 'middleware',
  apache: 'middleware',
  tomcat: 'middleware',
  weblogic: 'middleware',
  wildfly: 'middleware',
};

/** Middleware discovery via TCP probe + inventory config. */
export class MiddlewareConnector implements DiscoveryConnector {
  name = 'middleware';
  protocol = 'middleware';

  async *discover(config: ConnectorConfig): AsyncGenerator<DiscoveredAsset> {
    const kind = String(config.kind ?? 'nginx').toLowerCase();
    const endpoints = (config.endpoints as Array<Record<string, unknown>>) ?? [
      { host: config.host, port: config.port, name: config.name ?? kind },
    ];
    for (const ep of endpoints) {
      const host = String(ep.host ?? '127.0.0.1');
      const port = Number(ep.port ?? defaultPort(kind));
      const reachable = await tcpProbe(host, port, Number(config.timeoutMs ?? 3000));
      const name = String(ep.name ?? `${kind}@${host}:${port}`);
      yield {
        externalId: `${kind}://${host}:${port}`,
        name,
        ciType: MIDDLEWARE_CI[kind] ?? 'middleware',
        attributes: {
          kind,
          host,
          port,
          reachable,
          protocol: 'middleware',
          ciClass: 'Middleware',
          version: ep.version,
        },
        relationships: ep.runsOn
          ? [{ targetExternalId: String(ep.runsOn), type: 'runs_on' }]
          : undefined,
        aiConfidenceScore: reachable ? 86 : 50,
        tags: ['middleware', kind],
      };
    }
  }

  async healthCheck(config: ConnectorConfig): Promise<boolean> {
    const kind = String(config.kind ?? 'nginx');
    return tcpProbe(String(config.host ?? '127.0.0.1'), Number(config.port ?? defaultPort(kind)), 2000);
  }
}

function defaultPort(kind: string): number {
  switch (kind) {
    case 'kafka':
      return 9092;
    case 'rabbitmq':
      return 5672;
    case 'apache':
      return 80;
    case 'tomcat':
      return 8080;
    case 'weblogic':
      return 7001;
    case 'wildfly':
      return 8080;
    default:
      return 80;
  }
}

function tcpProbe(host: string, port: number, timeoutMs: number): Promise<boolean> {
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
