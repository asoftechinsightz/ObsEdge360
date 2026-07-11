import { createLogger } from '@opsedge360/shared-logger';
import type { PluginManifest } from './types';

const log = createLogger('agent-framework', { module: 'plugin-host' });

export interface CollectorContext {
  agentId: string;
  platform: string;
  config: Record<string, unknown>;
}

export interface CollectorResult {
  metrics?: Array<{ name: string; value: number; labels?: Record<string, string> }>;
  logs?: Array<{ body: string; severity?: string; attributes?: Record<string, unknown> }>;
  events?: Array<{ type: string; message: string; attributes?: Record<string, unknown> }>;
}

export interface CollectorPlugin {
  manifest: PluginManifest;
  collect(ctx: CollectorContext): Promise<CollectorResult>;
}

/**
 * Plugin host — collectors are independently registered; core agent never
 * hard-codes vendor collectors beyond built-ins loaded at startup.
 */
export class PluginHost {
  private readonly plugins = new Map<string, CollectorPlugin>();

  register(plugin: CollectorPlugin): void {
    this.plugins.set(plugin.manifest.id, plugin);
    log.info('Plugin registered', { id: plugin.manifest.id, version: plugin.manifest.version });
  }

  unregister(id: string): boolean {
    return this.plugins.delete(id);
  }

  list(): PluginManifest[] {
    return [...this.plugins.values()].map((p) => p.manifest);
  }

  get(id: string): CollectorPlugin | undefined {
    return this.plugins.get(id);
  }

  async collectEnabled(ctx: CollectorContext, enabledIds: string[]): Promise<CollectorResult> {
    const out: CollectorResult = { metrics: [], logs: [], events: [] };
    for (const id of enabledIds) {
      const plugin = this.plugins.get(id);
      if (!plugin) continue;
      try {
        const r = await plugin.collect(ctx);
        if (r.metrics) out.metrics!.push(...r.metrics);
        if (r.logs) out.logs!.push(...r.logs);
        if (r.events) out.events!.push(...r.events);
      } catch (err) {
        log.warn('Collector failed', { id, error: (err as Error).message });
        out.events!.push({ type: 'collector.error', message: (err as Error).message, attributes: { pluginId: id } });
      }
    }
    return out;
  }
}
