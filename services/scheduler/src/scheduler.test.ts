import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function computeNextRun(cron: string | null): Date | null {
  if (!cron) return new Date(Date.now() + 60_000);
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return new Date(Date.now() + 300_000);
  const minute = parts[0] === '*' ? new Date().getMinutes() + 1 : Number(parts[0]);
  const next = new Date();
  next.setMinutes(minute % 60, 0, 0);
  if (next <= new Date()) next.setHours(next.getHours() + 1);
  return next;
}

describe('scheduler', () => {
  it('computes next run for null cron', () => {
    const next = computeNextRun(null);
    assert.ok(next);
    assert.ok(next.getTime() > Date.now());
  });
});
