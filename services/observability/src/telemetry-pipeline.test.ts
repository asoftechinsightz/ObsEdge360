import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePayload } from './telemetry-pipeline.service';

describe('telemetry-pipeline', () => {
  it('normalizes syslog lines', () => {
    const records = normalizePayload('syslog', 'Jun 10 host app: error connection refused');
    assert.equal(records.length, 1);
    assert.equal(records[0].source, 'syslog');
    assert.equal(records[0].severity, 'error');
  });

  it('normalizes nginx json logs', () => {
    const records = normalizePayload('nginx', '{"message":"GET /api","level":"info","timestamp":"2026-07-10T00:00:00Z"}');
    assert.equal(records[0].body, 'GET /api');
  });
});
