#!/usr/bin/env node
/**
 * OpsEdge360 infrastructure monitoring retest
 * Usage: node scripts/opsedge360-infra-retest.mjs [--gateway URL] [--token JWT]
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
  console.log('OpsEdge360 infra monitoring retest\n');
  if (!token) {
    console.log('No JWT — pass --token or OBS360_TOKEN\n');
    process.exit(1);
  }

  const suffix = Date.now();
  const target = await req('POST', '/observability/scrape-targets', {
    name: `retest-node-${suffix}`,
    jobName: 'node',
    targets: [`host-${suffix}:9100`],
    scrapeIntervalSeconds: 30,
  });
  checks.push({ label: 'Create scrape target', ok: target.ok && !!target.data?.id });
  const targetId = target.data?.id;

  if (targetId) {
    const scrape = await req('POST', `/observability/scrape-targets/${targetId}/scrape`, {});
    checks.push({ label: 'Run scrape', ok: scrape.ok && scrape.data?.metricsIngested >= 1 });
  }

  const hosts = await req('GET', '/observability/hosts');
  checks.push({ label: 'Host dashboard', ok: hosts.ok && typeof hosts.data?.totalHosts === 'number' });

  const channel = await req('POST', '/observability/channels', {
    name: `retest-webhook-${suffix}`,
    channelType: 'webhook',
    config: { url: 'https://example.com/hooks/obs360' },
  });
  checks.push({ label: 'Create channel', ok: channel.ok && !!channel.data?.id });
  const channelId = channel.data?.id;

  const rule = await req('POST', '/observability/alert-rules', {
    name: `retest-cpu-${suffix}`,
    metric: 'cpu_pct',
    operator: 'gt',
    threshold: 1,
    severity: 'warning',
    channelIds: channelId ? [channelId] : [],
  });
  checks.push({ label: 'Create alert rule', ok: rule.ok && !!rule.data?.id });
  const ruleId = rule.data?.id;

  const evaluate = await req('POST', '/observability/alert-rules/evaluate', {});
  checks.push({ label: 'Evaluate rules', ok: evaluate.ok && typeof evaluate.data?.fired === 'number' });

  const events = await req('GET', '/observability/alert-events');
  checks.push({ label: 'List alert events', ok: events.ok && Array.isArray(events.data?.events) });

  const summary = await req('GET', '/observability/infra/summary');
  checks.push({ label: 'Infra summary', ok: summary.ok && summary.data?.hosts });

  if (ruleId) await req('DELETE', `/observability/alert-rules/${ruleId}`);
  if (channelId) await req('DELETE', `/observability/channels/${channelId}`);
  if (targetId) await req('DELETE', `/observability/scrape-targets/${targetId}`);

  for (const c of checks) console.log(`[${c.ok ? 'PASS' : 'FAIL'}] ${c.label}`);
  const failed = checks.filter((c) => !c.ok).length;
  if (failed) {
    console.log(`\n${failed} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll infra monitoring checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
