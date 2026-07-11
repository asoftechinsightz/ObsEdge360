import { createLogger } from '@opsedge360/shared-logger';
import type { UpdateManifest } from './types';

const log = createLogger('agent-framework', { module: 'update-manager' });

export interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  manifest?: UpdateManifest;
}

/** Auto-update framework interfaces — package distribution deferred. */
export interface UpdateDownloader {
  download(manifest: UpdateManifest): Promise<Buffer>;
}

export interface UpdateVerifier {
  verifyChecksum(payload: Buffer, expectedSha256: string): boolean;
  verifySignature?(payload: Buffer, signature: string, publicKeyPem: string): boolean;
}

export interface UpdateApplier {
  apply(payload: Buffer, manifest: UpdateManifest): Promise<void>;
  rollback(): Promise<void>;
  safeRestart(): Promise<void>;
}

export class UpdateManager implements UpdateVerifier {
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

  verifySignature(payload: Buffer, signature: string, publicKeyPem: string): boolean {
    try {
      const crypto = require('crypto') as typeof import('crypto');
      const verifier = crypto.createVerify('SHA256');
      verifier.update(payload);
      verifier.end();
      return verifier.verify(publicKeyPem, signature, 'base64');
    } catch {
      return false;
    }
  }

  /** Orchestration stub — distribution not implemented in Wave 2. */
  async prepareUpdate(
    manifest: UpdateManifest,
    downloader?: UpdateDownloader,
    applier?: UpdateApplier,
  ): Promise<{ prepared: boolean; reason: string }> {
    if (!downloader || !applier) {
      return { prepared: false, reason: 'update_distribution_not_configured' };
    }
    const payload = await downloader.download(manifest);
    if (!this.verifyChecksum(payload, manifest.checksumSha256)) {
      return { prepared: false, reason: 'checksum_mismatch' };
    }
    if (manifest.signature) {
      // Signature verification requires configured public key via env
      const pub = process.env.AGENT_UPDATE_PUBLIC_KEY_PEM;
      if (pub && !this.verifySignature(payload, manifest.signature, pub)) {
        return { prepared: false, reason: 'signature_invalid' };
      }
    }
    await applier.apply(payload, manifest);
    return { prepared: true, reason: 'applied' };
  }
}
