import { readFileSync, existsSync } from 'fs';
import { createLogger } from '@opsedge360/shared-logger';
import { generateCertificateFingerprint } from './config-sync';

const log = createLogger('agent-framework', { module: 'certificate-manager' });

export interface TlsMaterial {
  cert?: Buffer;
  key?: Buffer;
  ca?: Buffer;
}

export interface CertificateInfo {
  fingerprint: string;
  subject?: string;
  expiresAt?: string;
  mtlsReady: boolean;
}

export class CertificateManager {
  constructor(
    private readonly certPath?: string,
    private readonly keyPath?: string,
    private readonly caPath?: string,
  ) {}

  load(): TlsMaterial {
    const material: TlsMaterial = {};
    if (this.certPath && existsSync(this.certPath)) {
      material.cert = readFileSync(this.certPath);
    }
    if (this.keyPath && existsSync(this.keyPath)) {
      material.key = readFileSync(this.keyPath);
    }
    if (this.caPath && existsSync(this.caPath)) {
      material.ca = readFileSync(this.caPath);
    }
    return material;
  }

  inspect(): CertificateInfo {
    const material = this.load();
    const mtlsReady = Boolean(material.cert && material.key);
    if (!material.cert) {
      return { fingerprint: '', mtlsReady: false };
    }
    const pem = material.cert.toString('utf8');
    const fingerprint = generateCertificateFingerprint(pem);
    log.info('Certificate inspected', { fingerprint, mtlsReady });
    return { fingerprint, mtlsReady };
  }
}
