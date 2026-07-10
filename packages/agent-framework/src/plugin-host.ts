import { createLogger } from '@opsedge360/shared-logger';
import type { PluginManifest } from './types';

const log = createLogger('agent-framework', { module: 'plugin-host' });

export interface PluginHostOptions {
  maxPlugins: number;
  allowedSandboxes: Array<PluginManifest['sandbox']>;
}

export class PluginHost {
  private readonly plugins = new Map<string, PluginManifest>();
  private readonly options: PluginHostOptions;

  constructor(options: Partial<PluginHostOptions> = {}) {
    this.options = {
      maxPlugins: options.maxPlugins ?? 32,
      allowedSandboxes: options.allowedSandboxes ?? ['process', 'wasm'],
    };
  }

  list(): PluginManifest[] {
    return [...this.plugins.values()];
  }

  register(manifest: PluginManifest): void {
    if (this.plugins.size >= this.options.maxPlugins) {
      throw new Error('Plugin limit reached');
    }
    if (!this.options.allowedSandboxes.includes(manifest.sandbox)) {
      throw new Error(`Sandbox ${manifest.sandbox} not permitted`);
    }
    if (!/^[a-z0-9][a-z0-9._-]{1,63}$/i.test(manifest.id)) {
      throw new Error('Invalid plugin id');
    }
    this.plugins.set(manifest.id, manifest);
    log.info('Plugin registered', { pluginId: manifest.id, version: manifest.version });
  }

  unregister(pluginId: string): boolean {
    return this.plugins.delete(pluginId);
  }

  get(pluginId: string): PluginManifest | undefined {
    return this.plugins.get(pluginId);
  }
}
