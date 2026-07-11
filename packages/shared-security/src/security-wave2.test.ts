import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PermissionIds,
  PERMISSION_REGISTRY,
  isRegisteredPermission,
  incSecurityMetric,
  getSecurityMetrics,
  resetSecurityMetrics,
  toAuditLogRow,
} from './index';

describe('permission registry', () => {
  it('exposes stable permission ids', () => {
    assert.equal(PermissionIds.CMDB_READ, 'cmdb:read');
    assert.ok(PERMISSION_REGISTRY.length >= 8);
    assert.equal(isRegisteredPermission('cmdb:read'), true);
  });
});

describe('security metrics', () => {
  it('increments named counters', () => {
    resetSecurityMetrics();
    incSecurityMetric('security.auth.success');
    incSecurityMetric('security.auth.cross_tenant_attempt', 2);
    const m = getSecurityMetrics();
    assert.equal(m['security.auth.success'], 1);
    assert.equal(m['security.auth.cross_tenant_attempt'], 2);
  });
});

describe('audit event schema', () => {
  it('maps standard fields into audit_logs row shape', () => {
    const row = toAuditLogRow({
      tenantId: '11111111-1111-1111-1111-111111111111',
      userId: '22222222-2222-2222-2222-222222222222',
      eventCategory: 'authorization',
      eventType: 'deny',
      action: 'authz.deny',
      resource: 'tenant',
      decision: 'deny',
      policy: 'tenant-isolation-v1',
      reason: 'tenant_spoof',
      ip: '1.2.3.4',
    });
    assert.equal(row.tenantId, '11111111-1111-1111-1111-111111111111');
    assert.equal(row.actorId, '22222222-2222-2222-2222-222222222222');
    assert.equal((row.metadata as { outcome: string }).outcome, 'deny');
  });
});
