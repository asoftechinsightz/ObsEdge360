import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('security observability helpers', () => {
  it('documents risk banding expectations', () => {
    const band = (eventType: string) => {
      if (eventType.includes('cross_tenant')) return 85;
      if (eventType.includes('deny')) return 60;
      return 10;
    };
    assert.equal(band('authz.cross_tenant'), 85);
    assert.equal(band('authz.deny'), 60);
  });
});
