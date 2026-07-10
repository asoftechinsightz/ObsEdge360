import { execFile } from 'child_process';
import { promisify } from 'util';
import type { DiscoveryConnector, ConnectorConfig } from './types';
import type { DiscoveredAsset } from '@opsedge360/shared-types';

const execFileAsync = promisify(execFile);

interface SshTarget {
  host: string;
  port?: number;
  user: string;
  identityFile?: string;
  name?: string;
}

export class SshConnector implements DiscoveryConnector {
  name = 'ssh';
  protocol = 'ssh';

  async *discover(config: ConnectorConfig): AsyncGenerator<DiscoveredAsset> {
    const targets = (config.targets as SshTarget[]) ?? [];
    for (const target of targets) {
      const host = target.host;
      const port = target.port ?? 22;
      const user = target.user;
      const args = [
        '-o', 'BatchMode=yes',
        '-o', 'StrictHostKeyChecking=accept-new',
        '-o', `ConnectTimeout=${Number(config.timeoutSec ?? 10)}`,
        '-p', String(port),
      ];
      if (target.identityFile) args.push('-i', target.identityFile);
      args.push(`${user}@${host}`, 'uname -a; hostname; cat /etc/os-release 2>/dev/null || true');

      try {
        const { stdout } = await execFileAsync('ssh', args, { timeout: 15_000, maxBuffer: 64_000 });
        const lines = stdout.split('\n').filter(Boolean);
        const hostname = lines.find((l) => !l.includes('='))?.trim() ?? host;
        yield {
          externalId: `ssh://${host}:${port}`,
          name: target.name ?? hostname,
          ciType: 'server',
          attributes: {
            host,
            port,
            user,
            uname: lines[0],
            osRelease: lines.slice(2).join('\n'),
            protocol: 'ssh',
          },
          aiConfidenceScore: 95,
          tags: ['ssh-discovery', 'linux'],
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
