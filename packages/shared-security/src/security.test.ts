import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchPermission,
  hasPermission,
  generateApiKey,
  hashApiKey,
  verifyApiKey,
  evaluateAbac,
  TokenBucketRateLimiter,
  inferPermission,
  authorize,
  permissionsForLegacyRole,
} from './index';

describe('shared-security', () => {
  it('matches wildcard permissions', () => {
    assert.equal(matchPermission('discovery:*', 'discovery:scan'), true);
    assert.equal(matchPermission('cmdb:read', 'cmdb:write'), false);
  });

  it('evaluates auth context permissions', () => {
    const ctx = { tenantId: 't1', roles: ['admin'], permissions: ['*'] };
    assert.equal(hasPermission(ctx, 'cmdb:write'), true);
  });

  it('hashes and verifies API keys', () => {
    const { key } = generateApiKey();
    const hash = hashApiKey(key);
    assert.equal(verifyApiKey(key, hash), true);
    assert.equal(verifyApiKey('wrong', hash), false);
  });

  it('evaluates ABAC policies', () => {
    const policies = [{
      id: '1',
      effect: 'allow' as const,
      resource_pattern: 'cmdb:*',
      action_pattern: 'read',
      conditions: { env: 'prod' },
      priority: 10,
      enabled: true,
    }];
    assert.equal(evaluateAbac(policies, 'cmdb:cis', 'read', { env: 'prod' }), true);
    assert.equal(evaluateAbac(policies, 'cmdb:cis', 'read', { env: 'dev' }), false);
  });

  it('infers permissions from method and path', () => {
    assert.equal(inferPermission('GET', '/api/v1/cmdb/cis'), 'cmdb:read');
    assert.equal(inferPermission('GET', '/api/v1/twin/graph'), 'cmdb:read');
    assert.equal(inferPermission('POST', '/api/v1/twin/ai/explain'), 'cmdb:write');
    assert.equal(inferPermission('POST', '/api/v1/discovery/scan'), 'discovery:write');
    assert.equal(inferPermission('DELETE', '/api/v1/security/rules/1'), 'security:delete');
  });

  it('authorizes with RBAC and optional ABAC', () => {
    const ctx = { tenantId: 't1', roles: ['viewer'], permissions: ['cmdb:read'] };
    assert.equal(authorize(ctx, 'cmdb:read').allowed, true);
    assert.equal(authorize(ctx, 'cmdb:write').allowed, false);
  });

  it('maps legacy roles to permissions', () => {
    assert.deepEqual(permissionsForLegacyRole('admin'), ['*']);
    assert.ok(permissionsForLegacyRole('viewer').includes('*:read'));
  });

  it('rate limits token bucket', () => {
    const limiter = new TokenBucketRateLimiter(2, 1);
    assert.equal(limiter.consume('ip:1'), true);
    assert.equal(limiter.consume('ip:1'), true);
    assert.equal(limiter.consume('ip:1'), false);
  });
});
