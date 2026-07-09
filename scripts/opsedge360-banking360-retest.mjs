#!/usr/bin/env node
/**
 * OpsEdge360 Banking360 retest
 * Usage: node scripts/opsedge360-banking360-retest.mjs [--gateway URL] [--token JWT]
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
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  console.log('OpsEdge360 Banking360 retest\n');
  if (!token) {
    console.log('No JWT — pass --token or OBS360_TOKEN\n');
    process.exit(1);
  }

  const before = await req('GET', '/compliance/banking360');
  checks.push({ label: 'Banking360 dashboard', ok: before.ok && typeof before.data?.enabled === 'boolean' });

  const activate = await req('POST', '/compliance/banking360/activate', {});
  checks.push({
    label: 'Activate BFSI pack',
    ok: activate.ok && activate.data?.enabled === true,
  });

  const validate = await req('POST', '/compliance/banking360/validate', {});
  checks.push({
    label: 'RBI/PCI validation',
    ok: validate.ok && typeof validate.data?.overallScore === 'number',
  });

  const templates = await req('GET', '/compliance/banking360/payment-templates');
  checks.push({
    label: 'Payment templates',
    ok: templates.ok && templates.data?.templates?.length >= 3,
  });

  const apply = await req('POST', '/compliance/banking360/payment-templates/UPI-P2M/apply', {});
  checks.push({
    label: 'Apply UPI P2M template',
    ok: apply.ok && !!apply.data?.id,
  });

  const after = await req('GET', '/compliance/banking360');
  checks.push({
    label: 'RBI controls present',
    ok: after.ok && after.data?.controls?.rbiList?.length > 0,
  });
  checks.push({
    label: 'PCI controls present',
    ok: after.ok && after.data?.controls?.pciList?.length > 0,
  });
  checks.push({
    label: 'Payment flows monitored',
    ok: after.ok && after.data?.payments?.transactions?.length > 0,
  });

  for (const c of checks) console.log(`[${c.ok ? 'PASS' : 'FAIL'}] ${c.label}`);
  const failed = checks.filter((c) => !c.ok).length;
  if (failed) {
    console.log(`\n${failed} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll Banking360 checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
