#!/usr/bin/env node
/**
 * OpsEdge360 HA smoke test
 * Usage: node scripts/opsedge360-ha-smoke.mjs [--gateway URL] [--web URL] [--token JWT]
 */
const gateway = process.argv.includes('--gateway')
  ? process.argv[process.argv.indexOf('--gateway') + 1]
  : process.env.OBS360_GATEWAY_URL || 'http://localhost:4000';
const web = process.argv.includes('--web')
  ? process.argv[process.argv.indexOf('--web') + 1]
  : process.env.OBS360_WEB_URL || 'http://localhost:3000';
const token = process.argv.includes('--token')
  ? process.argv[process.argv.indexOf('--token') + 1]
  : process.env.OBS360_TOKEN;

const checks = [];

async function get(url, headers = {}) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

async function api(method, path, body) {
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
  console.log('OpsEdge360 HA smoke\n');

  const health = await get(`${gateway}/api/v1/health`);
  checks.push({ label: 'Gateway health', ok: health.ok });

  const webHealth = await get(web);
  checks.push({ label: 'Web UI reachable', ok: webHealth.ok || webHealth.status === 200 || webHealth.status === 307 || webHealth.status === 308 });

  const config = await get(`${gateway}/api/v1/platform/config`);
  checks.push({ label: 'Platform config', ok: config.ok || config.status === 200 || config.status === 401 });

  // Burst: concurrent health checks (gateway must stay up)
  const burst = await Promise.all(
    Array.from({ length: 10 }, () => get(`${gateway}/api/v1/health`)),
  );
  checks.push({ label: 'Gateway burst (10 concurrent)', ok: burst.every((b) => b.ok) });

  if (token) {
    const me = await api('GET', '/auth/me');
    checks.push({ label: 'Auth session', ok: me.ok && !!me.data?.email });

    const name = `ha-smoke-${Date.now()}`;
    const create = await api('POST', '/cmdb/cis', {
      name,
      ciType: 'service',
      status: 'active',
      healthScore: 100,
      externalId: name,
    });
    checks.push({ label: 'CMDB write', ok: create.ok && !!create.data?.id });

    if (create.data?.id) {
      const read = await api('GET', `/cmdb/cis/${create.data.id}`);
      checks.push({ label: 'CMDB read', ok: read.ok && read.data?.name === name });
      const del = await api('DELETE', `/cmdb/cis/${create.data.id}`);
      checks.push({ label: 'CMDB delete', ok: del.ok });
    }

    const unauth = await fetch(`${gateway}/api/v1/cmdb/cis`, {
      signal: AbortSignal.timeout(8000),
    });
    // With AUTH_REQUIRED=true expect 401; with false may be 200
    checks.push({
      label: 'Auth guard responsive',
      ok: unauth.status === 401 || unauth.status === 200,
    });
  } else {
    console.log('No JWT — skipping authenticated HA checks (set OBS360_TOKEN)\n');
  }

  for (const c of checks) console.log(`[${c.ok ? 'PASS' : 'FAIL'}] ${c.label}`);
  const failed = checks.filter((c) => !c.ok).length;
  if (failed) {
    console.log(`\n${failed} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nHA smoke passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
