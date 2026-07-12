import { createHmac, createHash, randomBytes, timingSafeEqual } from 'crypto';
import { decryptSecret, encryptSecret } from '@opsedge360/shared-security';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** RFC 4648 Base32 encode (no padding) */
export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/=+$/, '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of cleaned) {
    const idx = BASE32.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateTotpSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

function hotp(secret: Buffer, counter: number, digits = 6): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const str = (code % 10 ** digits).toString().padStart(digits, '0');
  return str;
}

/** RFC 6238 TOTP (SHA1, 30s, 6 digits) */
export function generateTotp(secretBase32: string, forTime = Date.now(), period = 30, digits = 6): string {
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(forTime / 1000 / period);
  return hotp(secret, counter, digits);
}

export function verifyTotp(secretBase32: string, code: string, window = 1, period = 30): boolean {
  if (!/^\d{6}$/.test(code || '')) return false;
  const now = Date.now();
  for (let w = -window; w <= window; w++) {
    const expected = generateTotp(secretBase32, now + w * period * 1000, period);
    const a = Buffer.from(expected);
    const b = Buffer.from(code);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

export function hashBackupCode(code: string): string {
  return createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = randomBytes(5).toString('hex').toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}

export function otpauthUrl(email: string, secret: string, issuer = 'OpsEdge360'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/** Deterministic lab challenge code (RC1 automation). Only accept when labCodesEnabled(). */
export function labChallengeCode(secret: string): string {
  const n = createHash('sha256').update(secret).digest().readUInt32BE(0) % 1000000;
  return n.toString().padStart(6, '0');
}

/** Production default: lab codes off. Set OPS_MFA_LAB_CODES=1 for automation/VPS validate. */
export function labCodesEnabled(): boolean {
  const v = (process.env.OPS_MFA_LAB_CODES || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

const MFA_ENC_PREFIX = 'oe360:v1:';

/** AES-256-GCM envelope for TOTP secrets at rest (RC3). */
export function encryptMfaSecret(plaintext: string): string {
  const { ciphertext, nonce, keyId } = encryptSecret(plaintext);
  return `${MFA_ENC_PREFIX}${keyId}:${nonce}:${ciphertext}`;
}

/** Decrypt envelope or return legacy plaintext Base32 secret. */
export function decryptMfaSecret(stored: string): string {
  if (!stored) return stored;
  if (!stored.startsWith(MFA_ENC_PREFIX)) return stored;
  const rest = stored.slice(MFA_ENC_PREFIX.length);
  const parts = rest.split(':');
  if (parts.length < 3) throw new Error('Invalid MFA secret envelope');
  const keyId = parts[0];
  const nonce = parts[1];
  const ciphertext = parts.slice(2).join(':');
  void keyId;
  return decryptSecret(ciphertext, nonce);
}

export function isEncryptedMfaSecret(stored: string): boolean {
  return !!stored && stored.startsWith(MFA_ENC_PREFIX);
}
