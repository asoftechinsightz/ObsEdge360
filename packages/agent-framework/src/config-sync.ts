import { createHash, randomBytes } from 'crypto';
import type { AgentConfigRevision } from './types';

export function computeConfigChecksum(config: Record<string, unknown>): string {
  const normalized = JSON.stringify(config, Object.keys(config).sort());
  return createHash('sha256').update(normalized).digest('hex');
}

export function verifyConfigChecksum(config: Record<string, unknown>, checksum: string): boolean {
  return computeConfigChecksum(config) === checksum;
}

export class ConfigSyncManager {
  private currentRevision = 0;
  private currentConfig: Record<string, unknown> = {};
  private currentChecksum = '';

  getRevision(): AgentConfigRevision {
    return {
      revision: this.currentRevision,
      config: this.currentConfig,
      checksum: this.currentChecksum,
    };
  }

  applyRemote(revision: number, config: Record<string, unknown>): AgentConfigRevision | null {
    const checksum = computeConfigChecksum(config);
    if (revision <= this.currentRevision && checksum === this.currentChecksum) {
      return null;
    }
    this.currentRevision = revision;
    this.currentConfig = config;
    this.currentChecksum = checksum;
    return {
      revision: this.currentRevision,
      config: this.currentConfig,
      checksum: this.currentChecksum,
      appliedAt: new Date().toISOString(),
    };
  }

  buildLocalPush(config: Record<string, unknown>): AgentConfigRevision {
    this.currentRevision += 1;
    this.currentConfig = config;
    this.currentChecksum = computeConfigChecksum(config);
    return {
      revision: this.currentRevision,
      config: this.currentConfig,
      checksum: this.currentChecksum,
      appliedAt: new Date().toISOString(),
    };
  }
}

export function generateCertificateFingerprint(pem: string): string {
  return createHash('sha256').update(pem).digest('hex').slice(0, 32);
}

export function generateAgentNonce(): string {
  return randomBytes(16).toString('hex');
}
