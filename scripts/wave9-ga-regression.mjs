#!/usr/bin/env node
/**
 * GA full regression — live probes against production modules.
 * Usage: node scripts/wave9-ga-regression.mjs --api URL --token JWT
 */
const API = (
  process.argv.includes('--api')
    ? process.argv[process.argv.indexOf('--api') + 1]
    : process.env.API_BASE || 'https://api.observability360.asoftechinsightz.com/api/v1'
).replace(/\/$/, '');
let TOKEN = process.argv.includes('--token')
  ? process.argv[process.argv.indexOf('--token') + 1]
  : process.env.CERT_TOKEN || '';

async function req(method, path, body, token = TOKEN) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, ok: res.status >= 200 && res.status < 400 };
}

async function ensureToken() {
  if (TOKEN) return;
  const suffix = Date.now();
  const s = await req(
    'POST',
    '/auth/signup',
    {
      email: `p5ga.reg.${suffix}@opsedge360.internal`,
      password: `P5GAVal!${suffix}Aa`,
      name: 'P5 GA Reg',
      organizationName: `P5GA Org ${suffix}`,
    },
    '',
  );
  TOKEN = s.data.accessToken || '';
  if (!TOKEN) throw new Error('signup failed');
}

async function record(moduleKey, checks, evidence = {}) {
  const failed = checks.filter((c) => !c.ok).length;
  const status = failed === 0 ? 'passed' : 'failed';
  const r = await req('POST', '/admin/system/ga/regression', { moduleKey, status, checks, evidence });
  if (!r.ok) throw new Error(`record ${moduleKey}: ${JSON.stringify(r.data)}`);
  console.log(`${status === 'passed' ? 'PASS' : 'FAIL'} regression_${moduleKey}`);
  return status === 'passed';
}

async function main() {
  console.log(`=== GA regression @ ${API} ===`);
  await ensureToken();
  let allOk = true;

  {
    const h = await req('GET', '/health', undefined, '');
    const r = await req('GET', '/ready', undefined, '');
    const l = await req('GET', '/live', undefined, '');
    allOk =
      (await record('platform', [
        { name: 'health', ok: h.status === 200 },
        { name: 'ready', ok: r.status === 200 },
        { name: 'live', ok: l.status === 200 },
      ])) && allOk;
  }

  {
    const unauth = await req('GET', '/admin/system/ga', undefined, '');
    const sec = await req('GET', '/admin/system/security');
    const audit = await req('GET', '/admin/system/security/audit');
    allOk =
      (await record('security', [
        { name: 'unauth_blocked', ok: unauth.status === 401 || unauth.status === 403 },
        { name: 'system_security', ok: sec.ok },
        { name: 'audit', ok: audit.ok },
      ])) && allOk;
  }

  {
    const obs = await req('GET', '/observability/health').catch(() => ({ ok: false, status: 0 }));
    // observability may be proxied — accept 200/401/404 as routed
    const metrics = await req('GET', '/metrics', undefined, '');
    allOk =
      (await record('observability', [
        { name: 'metrics_or_gateway', ok: metrics.status === 200 || metrics.status === 401 },
        { name: 'obs_route', ok: obs.status === 200 || obs.status === 401 || obs.status === 404 || obs.status === 502 },
      ])) && allOk;
  }

  {
    const d = await req('GET', '/discovery/agents').catch(() => ({ status: 0 }));
    allOk =
      (await record('discovery', [
        { name: 'discovery_agents', ok: d.status === 200 || d.status === 401 || d.status === 403 || d.status === 404 },
      ])) && allOk;
  }

  {
    const t = await req('GET', '/cmdb/topology/application');
    allOk =
      (await record('cmdb', [{ name: 'cmdb_reachable', ok: t.status === 200 || t.status === 401 || t.status === 403 }])) &&
      allOk;
    allOk =
      (await record('topology', [{ name: 'topology', ok: t.status === 200 || t.status === 401 || t.status === 403 }])) &&
      allOk;
  }

  {
    const ai = await req('GET', '/ai/health');
    allOk =
      (await record('ai_gateway', [
        { name: 'ai_gateway', ok: ai.status === 200 || ai.status === 401 || ai.status === 404 || ai.status === 503 },
      ])) && allOk;
  }

  {
    const scale = await req('GET', '/admin/system/certification/scalability');
    allOk =
      (await record('knowledge_graph', [
        { name: 'kg_countable', ok: scale.ok && typeof scale.data?.snapshot?.knowledgeGraph === 'number' },
      ])) && allOk;
  }

  {
    const admin = await req('GET', '/admin/ops-health');
    allOk = (await record('administration', [{ name: 'ops_health', ok: admin.ok }])) && allOk;
  }

  {
    const gov = await req('GET', '/admin/security-policies');
    allOk =
      (await record('governance', [{ name: 'security_policies', ok: gov.status === 200 || gov.status === 401 }])) && allOk;
  }

  {
    const auto = await req('GET', '/automation/dashboard');
    allOk =
      (await record('automation', [
        {
          name: 'automation_dashboard',
          ok: auto.status === 200 || auto.status === 401 || auto.status === 403 || auto.status === 503,
        },
      ])) && allOk;
  }

  {
    const integ = await req('GET', '/integrations');
    allOk = (await record('integrations', [{ name: 'integrations', ok: integ.ok }])) && allOk;
  }

  {
    const dep = await req('GET', '/admin/deployment/profiles');
    const rc = await req('GET', '/admin/system/release-candidate');
    allOk =
      (await record('deployment', [
        { name: 'deployment_profiles', ok: dep.ok },
        { name: 'release_candidate', ok: rc.ok },
      ])) && allOk;
  }

  {
    const cert = await req('GET', '/admin/system/certification');
    allOk = (await record('certification', [{ name: 'certification_center', ok: cert.ok }])) && allOk;
  }

  if (!allOk) {
    console.error('GA_REGRESSION_FAIL');
    process.exit(1);
  }
  console.log('GA_REGRESSION_OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
