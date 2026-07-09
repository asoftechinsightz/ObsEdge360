#!/usr/bin/env node
/**
 * OpsEdge360 smoke test — gateway + web health.
 * Usage: node scripts/opsedge360-smoke.mjs [--gateway URL] [--web URL]
 */
const gateway = process.argv.includes('--gateway')
  ? process.argv[process.argv.indexOf('--gateway') + 1]
  : process.env.OBS360_GATEWAY_URL || 'http://localhost:4000';
const web = process.argv.includes('--web')
  ? process.argv[process.argv.indexOf('--web') + 1]
  : process.env.OBS360_WEB_URL || 'http://localhost:3000';

const checks = [];

async function get(url, label) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const ok = res.ok;
    checks.push({ label, url, ok, status: res.status });
    return ok;
  } catch (err) {
    checks.push({ label, url, ok: false, error: err.message });
    return false;
  }
}

async function main() {
  console.log('OpsEdge360 smoke test\n');
  await get(`${gateway}/api/v1/health`, 'API gateway health');
  await get(`${gateway}/api/docs`, 'OpenAPI docs');
  await get(`${gateway}/api/v1/platform/config`, 'Platform config');
  await get(web, 'Web UI');

  for (const c of checks) {
    const icon = c.ok ? 'PASS' : 'FAIL';
    const detail = c.error || `HTTP ${c.status}`;
    console.log(`[${icon}] ${c.label} — ${c.url} (${detail})`);
  }

  const failed = checks.filter((c) => !c.ok).length;
  if (failed > 0) {
    console.log(`\n${failed} check(s) failed. Start stack: npm run dev`);
    process.exit(1);
  }
  console.log('\nAll checks passed.');
}

main();
