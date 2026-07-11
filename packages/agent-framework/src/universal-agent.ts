import http from 'http';
import os from 'os';
import { createLogger } from '@opsedge360/shared-logger';
import { DurableSqliteQueue } from './durable-queue';
import { AgentScheduler } from './scheduler';
import { PluginHost } from './plugin-host';
import { UpdateManager } from './update-manager';
import { ConfigSyncManager } from './config-sync';
import { encodeCompressedBody } from './compression';
import { CertificateManager } from './certificate-manager';
import {
  collectInventorySnapshot,
  detectAgentPlatform,
  hostLogsPlugin,
  hostMetricsPlugin,
} from './host-collectors';
import type { AgentConfig, AgentPlatform } from './types';

const log = createLogger('agent-framework', { module: 'universal-agent' });

export interface UniversalAgentOptions {
  apiUrl: string;
  agentId?: string;
  agentKey?: string;
  bootstrapToken?: string;
  name?: string;
  dataDir?: string;
  version?: string;
  healthPort?: number;
  fetchImpl?: typeof fetch;
}

export class UniversalAgent {
  private config!: AgentConfig;
  private readonly queue: DurableSqliteQueue;
  private readonly scheduler = new AgentScheduler();
  private readonly plugins = new PluginHost();
  private readonly configSync = new ConfigSyncManager();
  private readonly updateManager: UpdateManager;
  private readonly fetchFn: typeof fetch;
  private readonly opts: UniversalAgentOptions;
  private remoteConfig: Record<string, unknown> = {};
  private healthServer: http.Server | null = null;
  private started = false;

  constructor(opts: UniversalAgentOptions) {
    this.opts = opts;
    this.fetchFn = opts.fetchImpl ?? fetch;
    this.queue = new DurableSqliteQueue({
      dataDir: opts.dataDir ?? './.opsedge360-agent',
      maxItems: 5000,
      encryptionSecret: opts.agentKey ?? opts.bootstrapToken ?? 'opsedge360-agent',
    });
    this.updateManager = new UpdateManager(opts.version ?? '1.0.0');
    this.plugins.register(hostMetricsPlugin);
    this.plugins.register(hostLogsPlugin);
  }

  async start(): Promise<void> {
    if (this.started) return;
    const platform = detectAgentPlatform() as AgentPlatform;
    if (!this.opts.agentId || !this.opts.agentKey) {
      if (!this.opts.bootstrapToken) {
        throw new Error('Provide AGENT_ID+AGENT_KEY or BOOTSTRAP_TOKEN');
      }
      const enrolled = await this.enroll(platform);
      this.opts.agentId = enrolled.agentId;
      this.opts.agentKey = enrolled.agentKey;
    }

    this.config = {
      agentId: this.opts.agentId!,
      agentKey: this.opts.agentKey!,
      apiUrl: this.opts.apiUrl.replace(/\/$/, ''),
      platform,
      name: this.opts.name ?? `ua-${os.hostname()}`,
      version: this.opts.version ?? '1.0.0',
      heartbeatIntervalMs: 30_000,
      configPollIntervalMs: 60_000,
      offlineQueueMaxItems: 5000,
      compressionEnabled: false,
      tlsVerify: true,
      mtlsCertPath: process.env.MTLS_CERT_PATH,
      mtlsKeyPath: process.env.MTLS_KEY_PATH,
      mtlsCaPath: process.env.MTLS_CA_PATH,
      capabilities: ['metrics', 'logs', 'heartbeat', 'config', 'plugins', 'otlp'],
      labels: {},
    };

    if (this.config.mtlsCertPath) {
      const certs = new CertificateManager(
        this.config.mtlsCertPath,
        this.config.mtlsKeyPath,
        this.config.mtlsCaPath,
      );
      const info = certs.inspect();
      log.info('mTLS material inspected', { ...info });
    }

    await this.pullConfig();
    this.applyScheduleFromConfig();
    this.startHealthServer();
    this.started = true;
    log.info('Universal agent started', {
      agentId: this.config.agentId,
      platform: this.config.platform,
      queueBackend: this.queue.backend,
    });
  }

  stop(): void {
    this.scheduler.stopAll();
    this.healthServer?.close();
    this.started = false;
  }

  private authHeaders(): Record<string, string> {
    return {
      'X-Agent-Key': this.config.agentKey,
      'X-Agent-Platform': this.config.platform,
      'X-Agent-Version': this.config.version,
    };
  }

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const headers: Record<string, string> = { ...this.authHeaders() };
    let requestBody: string | undefined;
    if (body !== undefined) {
      if (this.config.compressionEnabled && method !== 'GET') {
        const encoded = encodeCompressedBody(body);
        Object.assign(headers, encoded.headers);
        requestBody = encoded.body;
      } else {
        headers['Content-Type'] = 'application/json';
        requestBody = JSON.stringify(body);
      }
    }
    try {
      const res = await this.fetchFn(`${this.config.apiUrl}${path}`, { method, headers, body: requestBody });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      return data;
    } catch (err) {
      if (body !== undefined && method !== 'GET') {
        this.queue.enqueue({
          endpoint: path,
          method: method as 'POST' | 'PUT' | 'PATCH',
          headers,
          body,
          compressed: this.config.compressionEnabled,
        });
      }
      throw err;
    }
  }

  private async enroll(platform: AgentPlatform) {
    const res = await this.fetchFn(`${this.opts.apiUrl.replace(/\/$/, '')}/api/v1/ua/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bootstrapToken: this.opts.bootstrapToken,
        name: this.opts.name ?? `ua-${os.hostname()}`,
        hostname: os.hostname(),
        platform,
        osVersion: `${os.type()} ${os.release()}`,
        architecture: os.arch(),
        version: this.opts.version ?? '1.0.0',
        inventory: collectInventorySnapshot(),
      }),
    });
    const data = (await res.json()) as { agent?: { id: string }; agentKey?: string; error?: string };
    if (!res.ok || !data.agent?.id || !data.agentKey) {
      throw new Error(data.error ?? 'Enrollment failed');
    }
    return { agentId: data.agent.id, agentKey: data.agentKey };
  }

  private applyScheduleFromConfig() {
    const hb = Number(this.remoteConfig.heartbeatIntervalMs ?? this.config.heartbeatIntervalMs);
    const cfgPoll = Number(this.remoteConfig.configPollIntervalMs ?? this.config.configPollIntervalMs);
    const inv = Number(this.remoteConfig.inventoryIntervalMs ?? 300_000);
    this.config.heartbeatIntervalMs = hb;
    this.config.configPollIntervalMs = cfgPoll;

    this.scheduler.schedule('heartbeat', hb, () => this.heartbeat());
    this.scheduler.schedule('config', cfgPoll, () => this.pullConfig());
    this.scheduler.schedule('inventory', inv, () => this.pushInventory());
    this.scheduler.schedule('collect', Math.min(hb, 60_000), () => this.collectAndUpload());
    this.scheduler.schedule('flush', 30_000, async () => { await this.flushQueue(); });
    this.scheduler.schedule('updates', 300_000, () => this.checkUpdates());
  }

  private enabledCollectors(): string[] {
    const list = this.remoteConfig.enabledCollectors;
    if (Array.isArray(list) && list.length) return list as string[];
    return ['host.metrics', 'host.logs'];
  }

  async heartbeat(): Promise<void> {
    const collected = await this.plugins.collectEnabled(
      { agentId: this.config.agentId, platform: this.config.platform, config: this.remoteConfig },
      ['host.metrics'],
    );
    const cpu = collected.metrics?.find((m) => m.name.includes('cpu.utilization'))?.value;
    const mem = collected.metrics?.find((m) => m.name.includes('memory.utilization'))?.value;
    await this.request('POST', `/api/v1/ua/agents/${this.config.agentId}/heartbeat`, {
      hostname: os.hostname(),
      version: this.config.version,
      status: 'online',
      metrics: {
        cpuPct: cpu,
        memoryPct: mem,
        load1m: os.loadavg()[0],
      },
      health: {
        healthy: true,
        queueDepth: this.queue.size,
        cpuUsage: cpu,
        memoryUsage: mem,
        collectorStatus: Object.fromEntries(this.plugins.list().map((p) => [p.id, 'ok'])),
        details: { queueBackend: this.queue.backend },
      },
    });
    await this.request('POST', `/api/v1/ua/agents/${this.config.agentId}/plugins`, {
      plugins: this.plugins.list().map((p) => ({
        pluginId: p.id,
        name: p.name,
        version: p.version,
        status: 'enabled',
      })),
    });
  }

  async pushInventory(): Promise<void> {
    await this.request('POST', `/api/v1/ua/agents/${this.config.agentId}/inventory`, collectInventorySnapshot());
  }

  async pullConfig(): Promise<void> {
    if (!this.config?.agentId) return;
    const remote = (await this.request(
      'GET',
      `/api/v1/ua/agents/${this.config.agentId}/config`,
    )) as { revision: number; config: Record<string, unknown> };
    const applied = this.configSync.applyRemote(remote.revision, remote.config ?? {});
    if (applied) {
      this.remoteConfig = applied.config;
      // Hot-reload schedules without process restart
      if (this.started) this.applyScheduleFromConfig();
      log.info('Remote config applied', { revision: applied.revision });
    }
  }

  async collectAndUpload(): Promise<void> {
    if (this.remoteConfig.otlpEnabled === false) return;
    const result = await this.plugins.collectEnabled(
      { agentId: this.config.agentId, platform: this.config.platform, config: this.remoteConfig },
      this.enabledCollectors(),
    );
    if (result.metrics?.length) {
      await this.request('POST', `/api/v1/ua/agents/${this.config.agentId}/telemetry/metrics`, {
        metrics: result.metrics.map((m) => ({
          name: m.name,
          value: m.value,
          serviceName: 'universal-agent',
          labels: m.labels,
        })),
      });
    }
    if (result.logs?.length) {
      await this.request('POST', `/api/v1/ua/agents/${this.config.agentId}/telemetry/logs`, {
        logs: result.logs.map((l) => ({
          body: l.body,
          severity: l.severity,
          serviceName: 'universal-agent',
          attributes: l.attributes,
        })),
      });
    }
  }

  async flushQueue(): Promise<number> {
    let flushed = 0;
    while (this.queue.size > 0) {
      const item = this.queue.dequeue();
      if (!item) break;
      try {
        await this.fetchFn(`${this.config.apiUrl}${item.endpoint}`, {
          method: item.method,
          headers: item.headers,
          body: JSON.stringify(item.body),
        });
        flushed += 1;
      } catch {
        this.queue.requeueFront(item);
        break;
      }
    }
    return flushed;
  }

  async checkUpdates(): Promise<void> {
    try {
      const manifest = (await this.request(
        'GET',
        `/api/v1/ua/agents/${this.config.agentId}/updates`,
      )) as { version?: string; checksumSha256?: string; downloadUrl?: string; mandatory?: boolean } | null;
      if (manifest?.version) {
        this.updateManager.evaluate({
          version: manifest.version,
          downloadUrl: manifest.downloadUrl ?? '',
          checksumSha256: manifest.checksumSha256 ?? '',
          mandatory: Boolean(manifest.mandatory),
        });
      }
    } catch (err) {
      log.warn('Update check failed', { error: (err as Error).message });
    }
  }

  private startHealthServer() {
    const port = this.opts.healthPort ?? Number(process.env.AGENT_HEALTH_PORT ?? 0);
    if (!port) return;
    this.healthServer = http.createServer((_req, res) => {
      const body = JSON.stringify({
        ok: true,
        agentId: this.config?.agentId,
        version: this.config?.version,
        queueDepth: this.queue.size,
        queueBackend: this.queue.backend,
        platform: this.config?.platform,
        jobs: this.scheduler.list(),
        plugins: this.plugins.list().map((p) => p.id),
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(body);
    });
    this.healthServer.listen(port, '127.0.0.1', () => {
      log.info('Agent health endpoint listening', { port });
    });
  }

  getQueueSize(): number {
    return this.queue.size;
  }
}
