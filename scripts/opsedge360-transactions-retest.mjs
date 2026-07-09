#!/usr/bin/env node
/**
 * OpsEdge360 business transactions retest
 * Usage: node scripts/opsedge360-transactions-retest.mjs [--gateway URL] [--token JWT]
 */
const gateway = process.argv.includes('--gateway')
  ? process.argv[process.argv.indexOf('--gateway') + 1]
  : process.env.OBS360_GATEWAY_URL || 'http://localhost:4000';
const token = process.argv.includes('--token')
  ? process.argv[process.argv.indexOf('--token') + 1]
  : process.env.OBS360_TOKEN;

const checks = [];

async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${gateway}/api/v1${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  console.log('OpsEdge360 transactions retest\n');
  if (!token) {
    console.log('No JWT — pass --token or OBS360_TOKEN\n');
    process.exit(1);
  }

  const discover = await req('POST', '/transactions/discover', {
    name: 'UPI payment retest',
    spans: [
      { name: 'API Gateway', durationMs: 10, serviceName: 'api-gateway' },
      { name: 'UPI initiate', durationMs: 80, serviceName: 'payments' },
      { name: 'Ledger post', durationMs: 30, serviceName: 'ledger-db' },
    ],
  });
  checks.push({ label: 'Discover transaction', ok: discover.ok && !!discover.data?.id });
  const txId = discover.data?.id;

  if (txId) {
    const flow = await req('GET', `/transactions/${txId}/flow`);
    checks.push({
      label: 'Flow map',
      ok: flow.ok && flow.data?.nodes?.length >= 3 && flow.data?.edges?.length >= 2,
    });

    const traceId = `tx-retest-${Date.now()}`;
    await req('POST', '/observability/otlp/traces', {
      spans: [
        { traceId, spanId: '1', name: 'API Gateway', serviceName: 'api-gateway', durationMs: 12 },
        { traceId, spanId: '2', parentSpanId: '1', name: 'UPI initiate', serviceName: 'payments', durationMs: 90 },
        { traceId, spanId: '3', parentSpanId: '2', name: 'Ledger post', serviceName: 'ledger-db', durationMs: 35 },
      ],
    });

    const corr = await req('GET', `/transactions/${txId}/correlate`);
    checks.push({
      label: 'Cross-service correlation',
      ok: corr.ok && corr.data?.correlatedSteps >= 1,
    });

    await req('POST', `/transactions/${txId}/samples`, { latencyMs: 150, status: 'ok', stepCount: 3 });
    await req('POST', `/transactions/${txId}/samples`, { latencyMs: 220, status: 'warn', stepCount: 3 });

    const slo = await req('POST', '/transactions/slos', {
      transactionId: txId,
      name: `retest-p99-${Date.now()}`,
      metric: 'p99_latency_ms',
      targetValue: 200,
    });
    checks.push({ label: 'Create SLO', ok: slo.ok && !!slo.data?.id });
    const sloId = slo.data?.id;

    const dash = await req('GET', '/transactions/slos');
    checks.push({
      label: 'SLO dashboard',
      ok: dash.ok && typeof dash.data?.compliancePct === 'number',
    });

    const series = await req('GET', `/transactions/${txId}/latency?hours=24`);
    checks.push({ label: 'Latency series', ok: series.ok && Array.isArray(series.data?.series) });

    if (sloId) await req('DELETE', `/transactions/slos/${sloId}`);
  }

  for (const c of checks) console.log(`[${c.ok ? 'PASS' : 'FAIL'}] ${c.label}`);
  const failed = checks.filter((c) => !c.ok).length;
  if (failed) {
    console.log(`\n${failed} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll transaction checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
