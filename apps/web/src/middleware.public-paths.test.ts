import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Regression: public auth paths must remain reachable without JWT cookie.
 * Mirrors apps/web/src/middleware.ts allowlist (ADR-006).
 */
const PUBLIC_PATHS = ['/', '/login', '/signup', '/auth/callback', '/forgot-password', '/reset-password'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}

describe('auth middleware public routes (regression)', () => {
  it('allows forgot and reset password', () => {
    assert.equal(isPublicPath('/forgot-password'), true);
    assert.equal(isPublicPath('/reset-password'), true);
  });

  it('still protects dashboard', () => {
    assert.equal(isPublicPath('/dashboard'), false);
  });
});
