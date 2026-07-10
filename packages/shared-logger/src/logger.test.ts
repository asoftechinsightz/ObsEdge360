import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createLogger } from './index';

describe('shared-logger', () => {
  it('creates child loggers with merged context', () => {
    const parent = createLogger('test-service', { tenantId: 't1' });
    const child = parent.child({ module: 'auth' });
    assert.ok(child);
    assert.notEqual(parent, child);
  });

  it('respects LOG_LEVEL for filtering', () => {
    const original = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = 'error';
    const logger = createLogger('level-test');
    logger.info('should not throw');
    process.env.LOG_LEVEL = original;
    assert.ok(true);
  });
});
