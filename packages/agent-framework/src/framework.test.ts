import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OfflineQueue } from './offline-queue';
import { computeConfigChecksum, ConfigSyncManager } from './config-sync';
import { compressPayload } from './compression';

describe('agent-framework', () => {
  it('queues and dequeues offline messages', () => {
    const queue = new OfflineQueue(2);
    queue.enqueue({
      endpoint: '/test',
      method: 'POST',
      headers: {},
      body: { ok: true },
      compressed: false,
    });
    assert.equal(queue.size, 1);
    const item = queue.dequeue();
    assert.equal(item?.endpoint, '/test');
  });

  it('applies remote config revisions', () => {
    const sync = new ConfigSyncManager();
    const config = { interval: 60 };
    const checksum = computeConfigChecksum(config);
    const applied = sync.applyRemote(1, config);
    assert.equal(applied?.revision, 1);
    assert.equal(applied?.checksum, checksum);
    assert.equal(sync.applyRemote(1, config), null);
  });

  it('compresses large payloads', () => {
    const large = { data: 'x'.repeat(2048) };
    const result = compressPayload(large);
    assert.equal(result.compressed, true);
  });
});
