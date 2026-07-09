#!/usr/bin/env node
/**
 * OpsEdge360 discovery module retest
 * Usage: node scripts/opsedge360-discovery-retest.mjs [--gateway URL] [--token JWT]
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
  console.log('OpsEdge360 discovery retest\n');

  const protocols = await req('GET', '/discovery/protocols');
  checks.push({ label: 'List protocols', ok: protocols.ok && Array.isArray(protocols.data?.protocols) });

  if (!token) {
    console.log('No JWT — skipping authenticated tests. Pass --token or OBS360_TOKEN after login.\n');
    for (const c of checks) console.log(`[${c.ok ? 'PASS' : 'FAIL'}] ${c.label}`);
    process.exit(checks.every((c) => c.ok) ? 0 : 1);
  }

  const connectors = await req('GET', '/discovery/connectors');
  checks.push({ label: 'List connectors', ok: connectors.ok });

  const create = await req('POST', '/discovery/connectors', {
    name: `Retest SNMP ${Date.now()}`,
    protocol: 'snmp',
    config: { version: 'v2c', community: 'public', targets: ['127.0.0.1'] },
  });
  checks.push({ label: 'Create SNMP connector', ok: create.ok });
  const connectorId = create.data?.id;

  if (connectorId) {
    const scan = await req('POST', '/discovery/scan', { connectorId });
    checks.push({ label: 'Trigger scan', ok: scan.ok });

    const schedule = await req('POST', '/discovery/schedules', { connectorId, intervalMinutes: 60 });
    checks.push({ label: 'Create schedule', ok: schedule.ok });
    const scheduleId = schedule.data?.id;

    const agent = await req('POST', '/discovery/agents/register', { name: `retest-agent-${Date.now()}` });
    checks.push({ label: 'Register agent', ok: agent.ok && !!agent.data?.agentKey });
    const agentId = agent.data?.agent?.id;
    const agentKey = agent.data?.agentKey;

    if (agentId && agentKey) {
      const hb = await fetch(`${gateway}/api/v1/discovery/agents/${agentId}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Agent-Key': agentKey },
        body: JSON.stringify({ version: '1.0.0', status: 'online' }),
      });
      checks.push({ label: 'Agent heartbeat', ok: hb.ok });
    }

    const notifications = await req('GET', '/discovery/notifications');
    checks.push({ label: 'List notifications', ok: notifications.ok });

    if (scheduleId) {
      await req('DELETE', `/discovery/schedules/${scheduleId}`);
    }
    await req('DELETE', `/discovery/connectors/${connectorId}`);
  }

  for (const c of checks) {
    console.log(`[${c.ok ? 'PASS' : 'FAIL'}] ${c.label}`);
  }

  const failed = checks.filter((c) => !c.ok).length;
  if (failed > 0) {
    console.log(`\n${failed} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll discovery checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
