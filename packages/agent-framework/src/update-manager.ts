import { createLogger } from '@opsedge360/shared-logger';
import type { UpdateManifest } from './types';

const log = createLogger('agent-framework', { module: 'update-manager' });

export interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  manifest?: UpdateManifest;
}

export class UpdateManager {
  constructor(private readonly currentVersion: string) {}

  evaluate(manifest: UpdateManifest | null): UpdateCheckResult {
    if (!manifest || manifest.version === this.currentVersion) {
      return { updateAvailable: false, currentVersion: this.currentVersion };
    }
    log.info('Update available', { current: this.currentVersion, next: manifest.version });
    return {
      updateAvailable: true,
      currentVersion: this.currentVersion,
      manifest,
    };
  }

  verifyChecksum(payload: Buffer, expectedSha256: string): boolean {
    const crypto = require('crypto') as typeof import('crypto');
    const actual = crypto.createHash('sha256').update(payload).digest('hex');
    return actual === expectedSha256;
  }
}
