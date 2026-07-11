import os from 'os';
import { createLogger } from '@opsedge360/shared-logger';
import type { CollectorPlugin, CollectorResult, CollectorContext } from './plugin-host';

const log = createLogger('agent-framework', { module: 'host-collectors' });

function cpuPctSample(): number {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const c of cpus) {
    idle += c.times.idle;
    total += c.times.user + c.times.nice + c.times.sys + c.times.idle + c.times.irq;
  }
  return total > 0 ? Math.round((1 - idle / total) * 1000) / 10 : 0;
}

export const hostMetricsPlugin: CollectorPlugin = {
  manifest: {
    id: 'host.metrics',
    name: 'Host Metrics',
    version: '1.0.0',
    entrypoint: 'builtin',
    capabilities: ['metrics'],
    sandbox: 'none',
  },
  async collect(_ctx: CollectorContext): Promise<CollectorResult> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryPct = totalMem > 0 ? Math.round(((totalMem - freeMem) / totalMem) * 1000) / 10 : 0;
    const load = os.loadavg();
    return {
      metrics: [
        { name: 'system.cpu.utilization', value: cpuPctSample(), labels: { host: os.hostname() } },
        { name: 'system.memory.utilization', value: memoryPct, labels: { host: os.hostname() } },
        { name: 'system.cpu.load_1m', value: load[0] ?? 0, labels: { host: os.hostname() } },
        { name: 'system.memory.usage', value: totalMem - freeMem, labels: { unit: 'bytes' } },
      ],
    };
  },
};

export const hostLogsPlugin: CollectorPlugin = {
  manifest: {
    id: 'host.logs',
    name: 'Host Log Sampler',
    version: '1.0.0',
    entrypoint: 'builtin',
    capabilities: ['logs'],
    sandbox: 'none',
  },
  async collect(ctx: CollectorContext): Promise<CollectorResult> {
    // Platform-specific deep journal/event-log shipping uses OS adapters;
    // builtin emits a structured heartbeat log for pipeline continuity.
    const platform = ctx.platform;
    return {
      logs: [
        {
          body: `universal-agent heartbeat platform=${platform} host=${os.hostname()}`,
          severity: 'INFO',
          attributes: { 'log.source': platform === 'windows' ? 'windows-event' : 'journald', agentId: ctx.agentId },
        },
      ],
    };
  },
};

/** Extension interface stubs — implement without core changes. */
export interface PlatformExtension {
  id: string;
  detect(): Promise<boolean>;
  collectInventory?(): Promise<Record<string, unknown>>;
  collectMetrics?(): Promise<CollectorResult>;
}

export const platformExtensionRegistry: PlatformExtension[] = [
  { id: 'docker', async detect() { return false; } },
  { id: 'kubernetes', async detect() { return false; } },
  { id: 'vmware', async detect() { return false; } },
  { id: 'hyper-v', async detect() { return false; } },
  { id: 'aws-ec2', async detect() { return false; } },
  { id: 'azure-vm', async detect() { return false; } },
  { id: 'gcp-compute', async detect() { return false; } },
];

export function collectInventorySnapshot(): Record<string, unknown> {
  const nets = os.networkInterfaces();
  const ips: string[] = [];
  const macs: string[] = [];
  for (const entries of Object.values(nets)) {
    for (const e of entries ?? []) {
      if (e.address) ips.push(e.address);
      if (e.mac && e.mac !== '00:00:00:00:00:00') macs.push(e.mac);
    }
  }
  return {
    hostname: os.hostname(),
    platform: process.platform,
    osVersion: `${os.type()} ${os.release()}`,
    architecture: os.arch(),
    ipAddresses: [...new Set(ips)],
    macAddresses: [...new Set(macs)],
    cpu: { cores: os.cpus().length, model: os.cpus()[0]?.model },
    memory: { totalBytes: os.totalmem(), freeBytes: os.freemem() },
    disk: {},
    cloudMetadata: {},
  };
}

export function detectAgentPlatform(): 'windows' | 'linux' | 'mac' | 'generic' {
  if (process.platform === 'win32') return 'windows';
  if (process.platform === 'darwin') return 'mac';
  if (process.platform === 'linux') return 'linux';
  return 'generic';
}

log.info('Host collectors loaded');
