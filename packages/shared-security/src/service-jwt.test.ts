import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mintServiceJwt, verifyServiceJwt } from './service-jwt';

describe('service jwt', () => {
  it('mints and verifies short-lived service tokens', () => {
    const { token, jti, expiresIn } = mintServiceJwt({
      identityId: '11111111-1111-4111-8111-111111111111',
      tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      kind: 'service',
      scopes: ['cmdb:proxy'],
      ttlSeconds: 120,
    });
    assert.ok(expiresIn >= 120);
    const claims = verifyServiceJwt(token);
    assert.equal(claims.sub, '11111111-1111-4111-8111-111111111111');
    assert.equal(claims.jti, jti);
    assert.deepEqual(claims.scopes, ['cmdb:proxy']);
    assert.equal(claims.iss, 'opsedge360-trust');
  });

  it('rejects tampered tokens', () => {
    const { token } = mintServiceJwt({
      identityId: '11111111-1111-4111-8111-111111111111',
      tenantId: 'platform',
      kind: 'service',
      scopes: ['*'],
    });
    assert.throws(() => verifyServiceJwt(token + 'x'));
  });
});
