#!/usr/bin/env node
/**
 * OpsEdge360 APM / OTLP retest
 * Usage: node scripts/opsedge360-apm-retest.mjs [--gateway URL] [--token JWT]
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
  console.log('OpsEdge360 APM retest\n');
  if (!token) {
    console.log('No JWT — pass --token or OBS360_TOKEN\n');
    process.exit(1);
  }

  const traceId = `retest-${Date.now()}`;
  const metrics = await req('POST', '/observability/otlp/metrics', {
    metrics: [{ name: 'http_requests_total', value: 42, serviceName: 'api-gateway' }],
  });
  checks.push({ label: 'OTLP metrics ingest', ok: metrics.ok && metrics.data?.metricsReceived >= 1 });

  const logs = await req('POST', '/observability/otlp/logs', {
    logs: [
      { body: 'retest payment failed for order 99', severity: 'ERROR', serviceName: 'payments', traceId },
      { body: 'retest health ok', severity: 'INFO', serviceName: 'api-gateway', traceId },
    ],
  });
  checks.push({ label: 'OTLP logs ingest', ok: logs.ok && logs.data?.logsReceived >= 2 });

  const traces = await req('POST', '/observability/otlp/traces', {
    spans: [
      { traceId, spanId: 'a1', name: 'POST /pay', serviceName: 'api-gateway', durationMs: 90 },
      { traceId, spanId: 'a2', parentSpanId: 'a1', name: 'charge', serviceName: 'payments', durationMs: 60 },
      { traceId, spanId: 'a3', parentSpanId: 'a2', name: 'INSERT payment', serviceName: 'payments-db', durationMs: 12 },
    ],
  });
  checks.push({ label: 'OTLP traces ingest', ok: traces.ok && traces.data?.spansReceived >= 3 });

  const empty = await req('POST', '/observability/otlp/metrics', { metrics: [] });
  checks.push({ label: 'Reject empty metrics', ok: !empty.ok && empty.status === 400 });

  const map = await req('GET', '/observability/apm/service-map?hours=1');
  checks.push({
    label: 'Service map',
    ok: map.ok && Array.isArray(map.data?.nodes) && map.data.nodes.length >= 2,
  });

  const search = await req('GET', '/observability/apm/logs?q=payment&severity=ERROR');
  checks.push({
    label: 'Log search',
    ok: search.ok && search.data?.total >= 1,
  });

  const list = await req('GET', '/observability/apm/traces');
  checks.push({ label: 'List traces', ok: list.ok && Array.isArray(list.data?.traces) });

  const detail = await req('GET', `/observability/apm/traces/${traceId}`);
  checks.push({
    label: 'Trace detail',
    ok: detail.ok && detail.data?.spans?.length >= 3,
  });

  for (const c of checks) console.log(`[${c.ok ? 'PASS' : 'FAIL'}] ${c.label}`);
  const failed = checks.filter((c) => !c.ok).length;
  if (failed) {
    console.log(`\n${failed} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll APM checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
