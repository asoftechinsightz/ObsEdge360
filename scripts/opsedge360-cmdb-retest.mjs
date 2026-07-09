#!/usr/bin/env node
/**
 * OpsEdge360 CMDB module retest
 * Usage: node scripts/opsedge360-cmdb-retest.mjs [--gateway URL] [--token JWT]
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
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  console.log('OpsEdge360 CMDB retest\n');

  if (!token) {
    console.log('No JWT — pass --token or OBS360_TOKEN (or use AUTH_REQUIRED=false with a login token).\n');
    process.exit(1);
  }

  const stats = await req('GET', '/cmdb/stats');
  checks.push({ label: 'CMDB stats', ok: stats.ok && typeof stats.data?.totalAssets === 'number' });

  const createA = await req('POST', '/cmdb/cis', {
    name: `Retest-API-${Date.now()}`,
    ciType: 'service',
    status: 'active',
    healthScore: 95,
    externalId: `retest-a-${Date.now()}`,
  });
  checks.push({ label: 'Create CI A', ok: createA.ok && !!createA.data?.id });
  const idA = createA.data?.id;

  const createB = await req('POST', '/cmdb/cis', {
    name: `Retest-DB-${Date.now()}`,
    ciType: 'database',
    status: 'active',
    healthScore: 90,
    externalId: `retest-b-${Date.now()}`,
  });
  checks.push({ label: 'Create CI B', ok: createB.ok && !!createB.data?.id });
  const idB = createB.data?.id;

  if (idA) {
    const patch = await req('PATCH', `/cmdb/cis/${idA}`, { riskScore: 20, healthScore: 88 });
    checks.push({ label: 'Update CI', ok: patch.ok && patch.data?.riskScore === 20 });
  }

  let relId;
  if (idA && idB) {
    const rel = await req('POST', '/cmdb/relationships', {
      sourceCiId: idA,
      targetCiId: idB,
      relationshipType: 'depends_on',
      strength: 'critical',
    });
    checks.push({ label: 'Create relationship', ok: rel.ok && !!rel.data?.id });
    relId = rel.data?.id;
  }

  const listRel = await req('GET', '/cmdb/relationships');
  checks.push({ label: 'List relationships', ok: listRel.ok && Array.isArray(listRel.data?.relationships) });

  const imp = await req('POST', '/cmdb/import', {
    items: [
      { name: `Import-CI-${Date.now()}`, ciType: 'server', status: 'discovered', healthScore: 80 },
    ],
  });
  checks.push({ label: 'Import CI', ok: imp.ok && imp.data?.imported >= 1 });

  const exp = await req('GET', '/cmdb/export?format=json');
  checks.push({ label: 'Export JSON', ok: exp.ok && Array.isArray(exp.data?.items) });

  if (relId) await req('DELETE', `/cmdb/relationships/${relId}`);
  if (idA) await req('DELETE', `/cmdb/cis/${idA}`);
  if (idB) await req('DELETE', `/cmdb/cis/${idB}`);

  for (const c of checks) {
    console.log(`[${c.ok ? 'PASS' : 'FAIL'}] ${c.label}`);
  }

  const failed = checks.filter((c) => !c.ok).length;
  if (failed > 0) {
    console.log(`\n${failed} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll CMDB checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
