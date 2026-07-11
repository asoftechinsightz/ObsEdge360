import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { OfflineQueue } from './offline-queue';
import { DurableSqliteQueue } from './durable-queue';
import { computeConfigChecksum, ConfigSyncManager } from './config-sync';
import { compressPayload } from './compression';
import { AgentScheduler } from './scheduler';
import { PluginHost } from './plugin-host';
import { hostMetricsPlugin } from './host-collectors';
import { UpdateManager } from './update-manager';

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

  it('persists durable queue across instances', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ua-q-'));
    let q1: DurableSqliteQueue | undefined;
    let q2: DurableSqliteQueue | undefined;
    try {
      q1 = new DurableSqliteQueue({ dataDir: dir, encryptionSecret: 'test-secret' });
      q1.enqueue({
        endpoint: '/api/v1/ua/agents/x/heartbeat',
        method: 'POST',
        headers: {},
        body: { status: 'online' },
        compressed: false,
      });
      assert.equal(q1.size, 1);
      q1.close();
      q2 = new DurableSqliteQueue({ dataDir: dir, encryptionSecret: 'test-secret' });
      assert.equal(q2.size, 1);
      const item = q2.dequeue();
      assert.equal((item?.body as { status: string }).status, 'online');
      q2.close();
    } finally {
      q1?.close();
      q2?.close();
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // Windows may briefly lock temp dirs; ignore cleanup failures.
      }
    }
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

  it('schedules and cancels jobs', async () => {
    const sched = new AgentScheduler();
    let n = 0;
    sched.schedule(
      't',
      60_000,
      () => {
        n += 1;
      },
      true,
    );
    await new Promise((r) => setTimeout(r, 20));
    assert.ok(n >= 1);
    sched.stopAll();
  });

  it('runs host metrics plugin', async () => {
    const host = new PluginHost();
    host.register(hostMetricsPlugin);
    const result = await host.collectEnabled(
      { agentId: 'a', platform: 'linux', config: {} },
      ['host.metrics'],
    );
    assert.ok((result.metrics?.length ?? 0) > 0);
  });

  it('evaluates update manifests', () => {
    const um = new UpdateManager('1.0.0');
    const r = um.evaluate({
      version: '1.1.0',
      downloadUrl: 'https://example.invalid/agent',
      checksumSha256: 'abc',
      mandatory: false,
    });
    assert.equal(r.updateAvailable, true);
  });
});
