import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const KEY_LEN = 64;

export function hashAgentKey(key: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(key, salt, KEY_LEN).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyAgentKey(key: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, 'hex');
  const testBuf = scryptSync(key, salt, KEY_LEN);
  if (hashBuf.length !== testBuf.length) return false;
  return timingSafeEqual(hashBuf, testBuf);
}

export function generateAgentKey(): string {
  return `obs360_${randomBytes(24).toString('base64url')}`;
}
