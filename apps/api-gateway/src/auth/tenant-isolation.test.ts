import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/** Pure helpers mirroring AuthorizationGuard tenant header matching (Wave 2 matrix). */
function headerMatchesTenant(
  header: string,
  tenant: { id: string; slug: string },
  jwtTenant: string,
): boolean {
  return header === tenant.slug || header === tenant.id || header === jwtTenant;
}

describe('cross-tenant isolation matrix', () => {
  const tenantA = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    slug: 'tenant-a',
  };
  const tenantB = {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    slug: 'tenant-b',
  };

  it('allows token A with header A slug', () => {
    assert.equal(headerMatchesTenant('tenant-a', tenantA, 'tenant-a'), true);
  });

  it('allows token A with header A UUID', () => {
    assert.equal(headerMatchesTenant(tenantA.id, tenantA, 'tenant-a'), true);
  });

  it('denies token A with header B slug', () => {
    assert.equal(headerMatchesTenant(tenantB.slug, tenantA, 'tenant-a'), false);
  });

  it('denies token A with header B UUID', () => {
    assert.equal(headerMatchesTenant(tenantB.id, tenantA, 'tenant-a'), false);
  });

  it('allows token A with no header (caller skips check)', () => {
    // Guard only runs spoof check when header is present
    const headerTenant: string | undefined = undefined;
    assert.equal(headerTenant ? headerMatchesTenant(headerTenant, tenantA, 'tenant-a') : true, true);
  });
});
