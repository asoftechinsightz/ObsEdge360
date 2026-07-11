import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAuditEvent,
  contentHash,
  verifyContentHash,
  shouldEnqueueEvidence,
  AUDIT_SCHEMA_VERSION,
} from './audit-event';

describe('audit schema v1.1', () => {
  it('normalizes mandatory fields and versions schema', () => {
    const n = normalizeAuditEvent({
      tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      eventCategory: 'authorization',
      eventType: 'tenant_spoof',
      action: 'authz.deny',
      decision: 'deny',
    });
    assert.equal(n.schemaVersion, AUDIT_SCHEMA_VERSION);
    assert.equal(n.outcome, 'deny');
    assert.ok(n.eventId);
    assert.equal(n.organizationId, n.tenantId);
  });

  it('hashes canonically and verifies', () => {
    const event = normalizeAuditEvent({
      eventId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      eventCategory: 'authorization',
      eventType: 'deny',
      action: 'authz.deny',
      outcome: 'deny',
      timestamp: '2026-07-11T00:00:00.000Z',
    });
    const hash = contentHash(event);
    assert.equal(verifyContentHash(event, hash), true);
    assert.equal(verifyContentHash({ ...event, action: 'other' }, hash), false);
  });

  it('enqueues L2 for deny but not allow by default', () => {
    assert.equal(shouldEnqueueEvidence('authorization', 'deny'), true);
    assert.equal(shouldEnqueueEvidence('authorization', 'allow'), false);
  });
});
