import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/** Mirrors DashboardShell Banking360 pack gate (ADR-001). */
function isBanking360PackEnabled(envValue: string | undefined): boolean {
  if (envValue === undefined || envValue === '') return true;
  return envValue !== 'false' && envValue !== '0';
}

describe('Banking360 solution pack flag', () => {
  it('defaults to enabled for backward compatibility', () => {
    assert.equal(isBanking360PackEnabled(undefined), true);
    assert.equal(isBanking360PackEnabled(''), true);
  });

  it('can be disabled', () => {
    assert.equal(isBanking360PackEnabled('false'), false);
    assert.equal(isBanking360PackEnabled('0'), false);
  });

  it('explicit true stays enabled', () => {
    assert.equal(isBanking360PackEnabled('true'), true);
  });
});
