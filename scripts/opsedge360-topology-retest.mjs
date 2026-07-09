#!/usr/bin/env node
/**
 * OpsEdge360 topology / blast-radius retest
 * Usage: node scripts/opsedge360-topology-retest.mjs [--gateway URL] [--token JWT]
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
  console.log('OpsEdge360 topology retest\n');
  if (!token) {
    console.log('No JWT — pass --token or OBS360_TOKEN\n');
    process.exit(1);
  }

  const suffix = Date.now();
  const a = await req('POST', '/cmdb/cis', {
    name: `Topo-Root-${suffix}`,
    ciType: 'service',
    status: 'active',
    healthScore: 70,
    riskScore: 60,
    externalId: `topo-root-${suffix}`,
  });
  const b = await req('POST', '/cmdb/cis', {
    name: `Topo-Dep-${suffix}`,
    ciType: 'database',
    status: 'active',
    healthScore: 90,
    externalId: `topo-dep-${suffix}`,
  });
  const c = await req('POST', '/cmdb/cis', {
    name: `Topo-Leaf-${suffix}`,
    ciType: 'cache',
    status: 'active',
    healthScore: 95,
    externalId: `topo-leaf-${suffix}`,
  });

  checks.push({ label: 'Create topology CIs', ok: a.ok && b.ok && c.ok });
  const idA = a.data?.id;
  const idB = b.data?.id;
  const idC = c.data?.id;

  if (idA && idB && idC) {
    await req('POST', '/cmdb/relationships', {
      sourceCiId: idA,
      targetCiId: idB,
      relationshipType: 'depends_on',
      strength: 'critical',
    });
    await req('POST', '/cmdb/relationships', {
      sourceCiId: idB,
      targetCiId: idC,
      relationshipType: 'depends_on',
      strength: 'normal',
    });

    const graph = await req('GET', '/twin/graph');
    checks.push({
      label: 'Twin graph',
      ok: graph.ok && Array.isArray(graph.data?.nodes) && graph.data.nodes.length >= 3,
    });

    const impact = await req('GET', `/twin/impact/${idA}?depth=3&direction=downstream`);
    checks.push({
      label: 'Impact analysis',
      ok: impact.ok && impact.data?.affectedCis >= 2 && Array.isArray(impact.data?.nodes),
    });

    const blast = await req('GET', `/twin/blast-radius/${idA}?depth=2&direction=downstream`);
    checks.push({
      label: 'Blast radius',
      ok: blast.ok && blast.data?.rootCiId === idA && blast.data?.affectedCis >= 1,
    });

    const upstream = await req('GET', `/twin/blast-radius/${idC}?depth=3&direction=upstream`);
    checks.push({
      label: 'Upstream analysis',
      ok: upstream.ok && upstream.data?.affectedCis >= 1,
    });

    await req('DELETE', `/cmdb/cis/${idA}`);
    await req('DELETE', `/cmdb/cis/${idB}`);
    await req('DELETE', `/cmdb/cis/${idC}`);
  }

  for (const c of checks) console.log(`[${c.ok ? 'PASS' : 'FAIL'}] ${c.label}`);
  const failed = checks.filter((x) => !x.ok).length;
  if (failed) {
    console.log(`\n${failed} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll topology checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
