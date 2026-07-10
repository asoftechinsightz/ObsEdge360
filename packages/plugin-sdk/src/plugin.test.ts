import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PluginLifecycleManager, computeManifestChecksum } from './index';

describe('plugin-sdk', () => {
  it('registers valid plugin manifest', () => {
    const mgr = new PluginLifecycleManager();
    const base = {
      id: 'sample.plugin',
      name: 'Sample',
      version: '1.0.0',
      runtime: 'node' as const,
      entrypoint: 'index.js',
      capabilities: ['metrics'],
      permissions: ['read'],
      sandbox: 'process' as const,
      marketplaceReady: true,
    };
    const checksum = computeManifestChecksum(base);
    mgr.register({ ...base, checksumSha256: checksum });
    assert.ok(mgr.get('sample.plugin'));
  });
});
