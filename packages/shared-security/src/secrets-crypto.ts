import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGO = 'aes-256-gcm';

export function resolveMasterKey(): Buffer {
  const raw = process.env.SECRETS_MASTER_KEY;
  if (raw) {
    const buf = Buffer.from(raw, 'base64');
    if (buf.length === 32) return buf;
    // derive 32 bytes from provided passphrase
    return createHash('sha256').update(raw).digest();
  }
  if (process.env.NODE_ENV === 'production' && process.env.SECRETS_PROVIDER === 'local') {
    throw new Error('SECRETS_MASTER_KEY required for local secrets provider in production');
  }
  // Dev fallback — deterministic from JWT_SECRET or fixed label (not for prod)
  const seed = process.env.JWT_SECRET ?? 'opsedge360-dev-secrets-master';
  return createHash('sha256').update(`oe360-secrets:${seed}`).digest();
}

export function encryptSecret(plaintext: string, masterKey = resolveMasterKey()): { ciphertext: string; nonce: string; keyId: string } {
  const nonce = randomBytes(12);
  const cipher = createCipheriv(ALGO, masterKey, nonce);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([enc, tag]);
  return {
    ciphertext: payload.toString('base64'),
    nonce: nonce.toString('base64'),
    keyId: process.env.SECRETS_KEY_ID ?? 'local-v1',
  };
}

export function decryptSecret(ciphertextB64: string, nonceB64: string, masterKey = resolveMasterKey()): string {
  const payload = Buffer.from(ciphertextB64, 'base64');
  const nonce = Buffer.from(nonceB64, 'base64');
  const tag = payload.subarray(payload.length - 16);
  const data = payload.subarray(0, payload.length - 16);
  const decipher = createDecipheriv(ALGO, masterKey, nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export function maskSecret(value: string): string {
  if (!value) return '';
  if (value.length <= 4) return '****';
  return `${value.slice(0, 2)}${'*'.repeat(Math.min(value.length - 4, 12))}${value.slice(-2)}`;
}
