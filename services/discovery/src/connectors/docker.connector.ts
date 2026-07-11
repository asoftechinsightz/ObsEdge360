import type { DiscoveryConnector, ConnectorConfig } from './types';
import type { DiscoveredAsset } from '@opsedge360/shared-types';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/** Docker discovery via docker CLI when available; config inventory fallback. */
export class DockerConnector implements DiscoveryConnector {
  name = 'docker';
  protocol = 'docker';

  async *discover(config: ConnectorConfig): AsyncGenerator<DiscoveredAsset> {
    const host = String(config.host ?? 'localhost');
    try {
      const { stdout } = await execFileAsync(
        'docker',
        ['ps', '-a', '--format', '{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Networks}}'],
        { timeout: 15_000, maxBuffer: 2_000_000 },
      );
      for (const line of stdout.split('\n').filter(Boolean)) {
        const [id, name, image, status, networks] = line.split('\t');
        yield {
          externalId: `docker://${host}/container/${id}`,
          name: name || id,
          ciType: 'container',
          attributes: {
            containerId: id,
            image,
            status,
            networks,
            host,
            protocol: 'docker',
            ciClass: 'Container',
          },
          relationships: [{ targetExternalId: `docker://${host}`, type: 'runs_on' }],
          aiConfidenceScore: 90,
          tags: ['docker', 'container'],
        };
      }
      yield {
        externalId: `docker://${host}`,
        name: `Docker Host ${host}`,
        ciType: 'server',
        attributes: { host, role: 'docker-host', protocol: 'docker' },
        aiConfidenceScore: 85,
        tags: ['docker', 'host'],
      };
      return;
    } catch {
      /* fall through to inventory */
    }

    const containers = (config.containers as Array<Record<string, string>>) ?? [];
    for (const c of containers) {
      yield {
        externalId: `docker://${host}/container/${c.id ?? c.name}`,
        name: c.name ?? c.id ?? 'container',
        ciType: 'container',
        attributes: { ...c, host, protocol: 'docker', source: 'inventory' },
        relationships: c.hostId
          ? [{ targetExternalId: c.hostId, type: 'runs_on' }]
          : [{ targetExternalId: `docker://${host}`, type: 'runs_on' }],
        aiConfidenceScore: 70,
        tags: ['docker', 'inventory'],
      };
    }
  }

  async healthCheck(config: ConnectorConfig): Promise<boolean> {
    if (config.containers) return true;
    try {
      await execFileAsync('docker', ['version', '--format', '{{.Server.Version}}'], { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
