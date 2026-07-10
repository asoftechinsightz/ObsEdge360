import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { inferPermission } from '@opsedge360/shared-security';

describe('gateway authz policy inference', () => {
  it('centralizes permission inference for protected APIs', () => {
    assert.equal(inferPermission('GET', '/api/v1/cmdb/topology/application'), 'cmdb:read');
    assert.equal(inferPermission('POST', '/api/v1/observability/pipeline/ingest/x'), 'observability:write');
  });
});
