#!/usr/bin/env node
const http = require('http');

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function request(method, url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: u.hostname, port: u.port, path: u.pathname + u.search, method,
      headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': 'default', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(raw || '{}') }); }
        catch { resolve({ status: res.statusCode, data: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log('OpsEdge360 Phase 4 Bootstrap — Scale\n');

  console.log('1. Database migrations...');
  require('child_process').execSync('node database/migrations/run.js', { stdio: 'inherit' });

  console.log('\n2. Generate predictive forecasts...');
  try {
    const fc = await request('POST', `${API}/api/v1/analytics/forecast/generate`, {});
    console.log(`   ✓ Generated ${fc.data?.count ?? 0} forecast(s)`);
  } catch { console.log('   ⚠ Forecast generation skipped'); }

  console.log('\n3. PQC readiness assessment...');
  try {
    const pqc = await request('POST', `${API}/api/v1/quantum/readiness/assess`, {});
    console.log(`   ✓ PQC readiness score: ${pqc.data?.score ?? '—'}%`);
  } catch { console.log('   ⚠ Quantum assessment skipped'); }

  console.log('\n4. FedRAMP control assessment...');
  try {
    const fed = await request('POST', `${API}/api/v1/governance/fedramp/assess`, {});
    console.log(`   ✓ Assessed ${fed.data?.assessed ?? 0} controls, score: ${fed.data?.score?.overallScore ?? '—'}%`);
  } catch { console.log('   ⚠ FedRAMP assessment skipped'); }

  console.log('\n5. Enable healthcare industry pack...');
  try {
    await request('POST', `${API}/api/v1/compliance/packs/healthcare/enable`, {});
    console.log('   ✓ Healthcare pack enabled');
  } catch { console.log('   ⚠ Industry pack enable skipped'); }

  console.log('\n6. HA/DR failover test record...');
  try {
    await request('POST', `${API}/api/v1/governance/ha-dr/failover-test`, { regionCode: 'ap-south-2', result: 'pass' });
    console.log('   ✓ DR failover test recorded');
  } catch { console.log('   ⚠ Failover test skipped'); }

  console.log('\nPhase 4 bootstrap complete.');
  console.log('Open http://localhost:3000/analytics · /quantum · /governance · /compliance');
}

main().catch((e) => { console.error(e.message); process.exit(1); });
