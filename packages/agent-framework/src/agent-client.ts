import { createLogger } from '@opsedge360/shared-logger';
import { encodeCompressedBody } from './compression';
import { OfflineQueue } from './offline-queue';
import { ConfigSyncManager } from './config-sync';
import { UpdateManager } from './update-manager';
import type {
  AgentConfig,
  HeartbeatPayload,
  UpdateManifest,
  AgentConfigRevision,
} from './types';

const log = createLogger('agent-framework', { module: 'agent-client' });

export interface AgentClientOptions {
  fetchImpl?: typeof fetch;
  onConfigApplied?: (revision: AgentConfigRevision) => void;
}

export class AgentClient {
  private readonly config: AgentConfig;
  private readonly queue: OfflineQueue;
  private readonly configSync: ConfigSyncManager;
  private readonly updateManager: UpdateManager;
  private readonly fetchFn: typeof fetch;
  private readonly onConfigApplied?: (revision: AgentConfigRevision) => void;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private configTimer: ReturnType<typeof setInterval> | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: AgentConfig, options: AgentClientOptions = {}) {
    this.config = config;
    this.fetchFn = options.fetchImpl ?? fetch;
    this.onConfigApplied = options.onConfigApplied;
    this.queue = new OfflineQueue(config.offlineQueueMaxItems);
    this.configSync = new ConfigSyncManager();
    this.updateManager = new UpdateManager(config.version);
  }

  private baseUrl(): string {
    return this.config.apiUrl.replace(/\/$/, '');
  }

  private authHeaders(): Record<string, string> {
    return {
      'X-Agent-Key': this.config.agentKey,
      'X-Agent-Platform': this.config.platform,
      'X-Agent-Version': this.config.version,
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    useCompression = this.config.compressionEnabled,
  ): Promise<T> {
    const url = `${this.baseUrl()}${path}`;
    const headers: Record<string, string> = { ...this.authHeaders() };
    let requestBody: string | undefined;

    if (body !== undefined) {
      if (useCompression) {
        const encoded = encodeCompressedBody(body);
        Object.assign(headers, encoded.headers);
        requestBody = encoded.body;
      } else {
        headers['Content-Type'] = 'application/json';
        requestBody = JSON.stringify(body);
      }
    }

    try {
      const res = await this.fetchFn(url, { method, headers, body: requestBody });
      const data = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string };
      if (!res.ok) {
        throw new Error(data.error ?? data.message ?? `HTTP ${res.status}`);
      }
      return data;
    } catch (err) {
      if (body !== undefined && method !== 'GET') {
        this.queue.enqueue({
          endpoint: path,
          method: method as 'POST' | 'PUT' | 'PATCH',
          headers,
          body,
          compressed: useCompression,
        });
        log.warn('Request queued for offline retry', { path, queueSize: this.queue.size });
      }
      throw err;
    }
  }

  async register(hostname: string): Promise<{ agentId: string; agentKey: string }> {
    const result = await this.request<{ agent: { id: string }; agentKey: string }>(
      'POST',
      '/api/v1/discovery/agents/register',
      {
        name: this.config.name,
        hostname,
        capabilities: this.config.capabilities,
        platform: this.config.platform,
        version: this.config.version,
        labels: this.config.labels,
      },
      false,
    );
    return { agentId: result.agent.id, agentKey: result.agentKey };
  }

  async sendHeartbeat(payload: HeartbeatPayload): Promise<void> {
    await this.request(
      'POST',
      `/api/v1/discovery/agents/${this.config.agentId}/heartbeat`,
      payload,
    );
  }

  async pullConfig(): Promise<AgentConfigRevision | null> {
    const remote = await this.request<{ revision: number; config: Record<string, unknown> }>(
      'GET',
      `/api/v1/discovery/agents/${this.config.agentId}/config`,
      undefined,
      false,
    );
    const applied = this.configSync.applyRemote(remote.revision, remote.config);
    if (applied && this.onConfigApplied) this.onConfigApplied(applied);
    return applied;
  }

  async pushConfig(config: Record<string, unknown>): Promise<AgentConfigRevision> {
    const local = this.configSync.buildLocalPush(config);
    await this.request(
      'PUT',
      `/api/v1/discovery/agents/${this.config.agentId}/config`,
      { revision: local.revision, config: local.config, checksum: local.checksum },
    );
    return local;
  }

  async checkForUpdate(): Promise<ReturnType<UpdateManager['evaluate']>> {
    const manifest = await this.request<UpdateManifest | null>(
      'GET',
      `/api/v1/discovery/agents/${this.config.agentId}/updates`,
      undefined,
      false,
    );
    return this.updateManager.evaluate(manifest);
  }

  async flushQueue(): Promise<number> {
    let flushed = 0;
    while (this.queue.size > 0) {
      const item = this.queue.dequeue();
      if (!item) break;
      try {
        await this.fetchFn(`${this.baseUrl()}${item.endpoint}`, {
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

  start(
    collectMetrics: () => Promise<HeartbeatPayload['metrics']>,
    hostname: string,
  ): void {
    const beat = async () => {
      try {
        const metrics = await collectMetrics();
        await this.sendHeartbeat({
          hostname,
          version: this.config.version,
          status: 'online',
          metrics,
          metadata: { platform: this.config.platform, labels: this.config.labels },
        });
      } catch (err) {
        log.error('Heartbeat failed', err as Error, { agentId: this.config.agentId });
      }
    };

    this.heartbeatTimer = setInterval(beat, this.config.heartbeatIntervalMs);
    beat().catch(() => undefined);

    this.configTimer = setInterval(() => {
      this.pullConfig().catch((err) => {
        log.warn('Config pull failed', { error: (err as Error).message });
      });
    }, this.config.configPollIntervalMs);

    this.flushTimer = setInterval(() => {
      this.flushQueue().catch(() => undefined);
    }, 30_000);
  }

  stop(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.configTimer) clearInterval(this.configTimer);
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.heartbeatTimer = null;
    this.configTimer = null;
    this.flushTimer = null;
  }

  getQueueSize(): number {
    return this.queue.size;
  }
}
