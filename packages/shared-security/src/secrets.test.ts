import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encryptSecret, decryptSecret, maskSecret } from './secrets-crypto';
import { createSecretsProvider } from './secrets-provider';

describe('secrets crypto', () => {
  it('round-trips AES-GCM encryption', () => {
    const { ciphertext, nonce } = encryptSecret('super-secret-value');
    assert.equal(decryptSecret(ciphertext, nonce), 'super-secret-value');
  });

  it('masks secret values', () => {
    assert.equal(maskSecret('abcd'), '****');
    assert.match(maskSecret('my-api-key-12345'), /^my\*+45$/);
  });
});

describe('secrets providers', () => {
  it('returns stubs for cloud providers', async () => {
    const vault = createSecretsProvider('vault');
    const h = await vault.health();
    assert.equal(h.ok, false);
    await assert.rejects(() => vault.create({ tenantId: 't', name: 'x', value: 'y' }), /not configured/);
  });

  it('defaults to local provider', () => {
    assert.equal(createSecretsProvider('local').name, 'local');
  });
});
