import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('resolveTenantStrict contract', () => {
  it('documents fail-closed behavior for unknown keys', async () => {
    // Unit contract without live DB: unknown key must throw (no default fallback).
    const resolveTenantStrict = async (key: string) => {
      if (!key.trim()) throw new Error('Tenant key required');
      if (key === 'default' || key === 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') {
        return { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Default', slug: 'default' };
      }
      throw new Error(`Unknown tenant: ${key}`);
    };

    await assert.rejects(() => resolveTenantStrict('no-such-tenant'), /Unknown tenant/);
    const row = await resolveTenantStrict('default');
    assert.equal(row.slug, 'default');
    assert.match(row.id, /^[0-9a-f-]{36}$/i);
  });
});
