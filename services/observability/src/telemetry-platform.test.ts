import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateOtlpPayload } from './telemetry-platform.service';

describe('telemetry quality gate', () => {
  it('accepts OTLP resourceMetrics envelope', () => {
    const r = validateOtlpPayload('metrics', { resourceMetrics: [] });
    assert.equal(r.ok, true);
  });

  it('accepts flat metrics array wrapper', () => {
    const r = validateOtlpPayload('metrics', { metrics: [{ name: 'cpu', value: 1 }] });
    assert.equal(r.ok, true);
  });

  it('rejects empty object for metrics', () => {
    const r = validateOtlpPayload('metrics', {});
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'metrics_shape_invalid');
  });

  it('rejects non-object', () => {
    const r = validateOtlpPayload('logs', 'nope');
    assert.equal(r.ok, false);
  });
});
