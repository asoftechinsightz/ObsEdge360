import { createHash } from 'crypto';
import { createLogger } from '@opsedge360/shared-logger';

const log = createLogger('plugin-sdk');

export type PluginRuntime = 'node' | 'python' | 'java' | 'go' | 'dotnet' | 'rust';
export type PluginStatus = 'registered' | 'active' | 'disabled' | 'failed';
export type SandboxLevel = 'none' | 'process' | 'wasm' | 'container';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  runtime: PluginRuntime;
  entrypoint: string;
  capabilities: string[];
  permissions: string[];
  sandbox: SandboxLevel;
  checksumSha256: string;
  author?: string;
  marketplaceReady: boolean;
}

export interface PluginContext {
  tenantId: string;
  correlationId: string;
  config: Record<string, unknown>;
}

export interface PluginExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  durationMs: number;
}

export function validateManifest(manifest: PluginManifest): string[] {
  const errors: string[] = [];
  if (!/^[a-z][a-z0-9._-]{2,63}$/i.test(manifest.id)) errors.push('Invalid plugin id');
  if (!/^\d+\.\d+\.\d+/.test(manifest.version)) errors.push('Invalid semver version');
  if (!manifest.entrypoint) errors.push('Entrypoint required');
  if (!manifest.checksumSha256 || manifest.checksumSha256.length !== 64) {
    errors.push('checksumSha256 required (64 hex chars)');
  }
  return errors;
}

export function computeManifestChecksum(manifest: Omit<PluginManifest, 'checksumSha256'>): string {
  const normalized = JSON.stringify(manifest, Object.keys(manifest).sort());
  return createHash('sha256').update(normalized).digest('hex');
}

export class PluginLifecycleManager {
  private readonly plugins = new Map<string, PluginManifest>();

  register(manifest: PluginManifest): void {
    const errors = validateManifest(manifest);
    if (errors.length > 0) throw new Error(errors.join('; '));
    const expected = computeManifestChecksum({
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      runtime: manifest.runtime,
      entrypoint: manifest.entrypoint,
      capabilities: manifest.capabilities,
      permissions: manifest.permissions,
      sandbox: manifest.sandbox,
      author: manifest.author,
      marketplaceReady: manifest.marketplaceReady,
    });
    if (expected !== manifest.checksumSha256) {
      throw new Error('Manifest checksum mismatch');
    }
    this.plugins.set(`${manifest.id}@${manifest.version}`, manifest);
    log.info('Plugin registered', { pluginId: manifest.id, version: manifest.version });
  }

  get(pluginId: string, version?: string): PluginManifest | undefined {
    if (version) return this.plugins.get(`${pluginId}@${version}`);
    const matches = [...this.plugins.entries()].filter(([k]) => k.startsWith(`${pluginId}@`));
    return matches.sort(([a], [b]) => b.localeCompare(a))[0]?.[1];
  }

  list(): PluginManifest[] {
    return [...this.plugins.values()];
  }

  disable(pluginId: string, version: string): boolean {
    const key = `${pluginId}@${version}`;
    return this.plugins.delete(key);
  }
}

export const SUPPORTED_RUNTIMES: PluginRuntime[] = ['node', 'python', 'java', 'go', 'dotnet', 'rust'];

export const RUNTIME_ENTRYPOINTS: Record<PluginRuntime, string> = {
  node: 'index.js',
  python: 'main.py',
  java: 'PluginMain.class',
  go: 'plugin.so',
  dotnet: 'Plugin.dll',
  rust: 'libplugin.so',
};
