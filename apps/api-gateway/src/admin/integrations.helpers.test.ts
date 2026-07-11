import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  hashIdempotency,
  rateLimitOk,
  renderTemplate,
  signWebhookPayload,
  stripSecrets,
  withRetry,
} from './integrations.helpers';

describe('integrations.helpers', () => {
  it('renders templates', () => {
    assert.equal(renderTemplate('Hello {{name}}', { name: 'Ops' }), 'Hello Ops');
  });

  it('strips secret-like keys', () => {
    const out = stripSecrets({ url: 'https://x', apiToken: 'sekrit', password: 'x' });
    assert.equal(out.url, 'https://x');
    assert.equal(out.apiToken, '[redacted]');
  });

  it('signs webhook payloads', () => {
    const sig = signWebhookPayload('secret', '{"a":1}', '100');
    assert.equal(sig.length, 64);
  });

  it('retries then succeeds', async () => {
    let n = 0;
    const { attempts } = await withRetry({ maxAttempts: 3, backoffMs: 1, maxBackoffMs: 5 }, async () => {
      n += 1;
      if (n < 2) throw new Error('fail');
      return 'ok';
    });
    assert.equal(attempts, 2);
  });

  it('idempotency hash is stable', () => {
    assert.equal(hashIdempotency(['a', 1]), hashIdempotency(['a', 1]));
  });

  it('rate limits', () => {
    const key = `test-${Date.now()}`;
    assert.equal(rateLimitOk(key, 2), true);
    assert.equal(rateLimitOk(key, 2), true);
    assert.equal(rateLimitOk(key, 2), false);
  });
});
