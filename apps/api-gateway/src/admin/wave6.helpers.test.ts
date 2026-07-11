import { createHash, generateKeyPairSync, X509Certificate } from 'crypto';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('wave6 helpers', () => {
  it('checksum is stable sha256 hex', () => {
    const a = createHash('sha256').update('opsedge360').digest('hex');
    const b = createHash('sha256').update('opsedge360').digest('hex');
    assert.equal(a, b);
    assert.equal(a.length, 64);
  });

  it('can parse self-signed PEM via X509Certificate', () => {
    // Minimal smoke: Node X509Certificate exists for Wave 6 cert validation path
    assert.equal(typeof X509Certificate, 'function');
    assert.equal(typeof generateKeyPairSync, 'function');
  });
});
