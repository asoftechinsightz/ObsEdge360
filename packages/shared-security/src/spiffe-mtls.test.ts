import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildSpiffeId, spiffeTrustDomain } from './spiffe-mtls';

describe('spiffe helpers', () => {
  it('builds SPIFFE IDs under trust domain', () => {
    const id = buildSpiffeId('api-gateway', 'platform');
    assert.equal(id, `spiffe://${spiffeTrustDomain()}/ns/platform/sa/api-gateway`);
  });

  it('sanitizes identity names', () => {
    const id = buildSpiffeId('my service!', 't1');
    assert.match(id, /sa\/my-service-/);
  });
});
