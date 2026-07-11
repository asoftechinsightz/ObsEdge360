import type { DiscoveryConnector, ConnectorConfig } from './types';
import type { CiType, DiscoveredAsset } from '@opsedge360/shared-types';
import net from 'net';

const ENGINE_CI: Record<string, CiType> = {
  postgresql: 'database',
  mysql: 'database',
  mssql: 'database',
  oracle: 'database',
  mongodb: 'database',
  redis: 'cache',
};

/** Database discovery — TCP probe + configured instance inventory (credentials via secretRef). */
export class DatabaseConnector implements DiscoveryConnector {
  name = 'database';
  protocol = 'database';

  async *discover(config: ConnectorConfig): AsyncGenerator<DiscoveredAsset> {
    const engine = String(config.engine ?? 'postgresql').toLowerCase();
    const instances = (config.instances as Array<Record<string, unknown>>) ?? [
      {
        host: config.host,
        port: config.port,
        name: config.name ?? `${engine}-instance`,
        database: config.database,
      },
    ];

    for (const inst of instances) {
      const host = String(inst.host ?? '127.0.0.1');
      const port = Number(inst.port ?? defaultPort(engine));
      const reachable = await tcpProbe(host, port, Number(config.timeoutMs ?? 3000));
      const name = String(inst.name ?? `${engine}@${host}:${port}`);
      const externalId = `${engine}://${host}:${port}/${inst.database ?? ''}`;
      yield {
        externalId,
        name,
        ciType: ENGINE_CI[engine] ?? 'database',
        attributes: {
          engine,
          host,
          port,
          database: inst.database,
          reachable,
          protocol: 'database',
          ciClass: 'Database',
          version: inst.version,
        },
        relationships: inst.runsOn
          ? [{ targetExternalId: String(inst.runsOn), type: 'runs_on' }]
          : undefined,
        aiConfidenceScore: reachable ? 88 : 55,
        tags: ['database', engine, reachable ? 'reachable' : 'unreachable'],
      };
    }
  }

  async healthCheck(config: ConnectorConfig): Promise<boolean> {
    const host = String(config.host ?? '127.0.0.1');
    const engine = String(config.engine ?? 'postgresql');
    return tcpProbe(host, Number(config.port ?? defaultPort(engine)), 2000);
  }
}

function defaultPort(engine: string): number {
  switch (engine) {
    case 'mysql':
      return 3306;
    case 'mssql':
      return 1433;
    case 'oracle':
      return 1521;
    case 'mongodb':
      return 27017;
    case 'redis':
      return 6379;
    default:
      return 5432;
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
