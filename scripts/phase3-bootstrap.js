#!/usr/bin/env node
const http = require('http');

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const DISCOVERY = process.env.DISCOVERY_URL ?? 'http://localhost:4001';

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
  console.log('OpsEdge360 Phase 3 Bootstrap — Autonomy\n');

  console.log('1. Database migrations...');
  require('child_process').execSync('node database/migrations/run.js', { stdio: 'inherit' });

  console.log('\n2. OT discovery scan (OPC-UA, Modbus, MQTT)...');
  try {
    const scan = await request('POST', `${DISCOVERY}/scan`, {});
    console.log(`   ✓ Discovery: ${scan.data?.results?.length ?? 'ok'} connector(s)`);
  } catch { console.log('   ⚠ Discovery skipped'); }

  console.log('\n3. Fraud/anomaly analysis...');
  try {
    const analysis = await request('POST', `${API}/api/v1/security/analyze`, {
      metrics: [
        { name: 'payment.velocity.tps', value: 540 },
        { name: 'api.request.rate', value: 1350 },
        { name: 'login.failure.rate', value: 0.03 },
      ],
    });
    console.log(`   ✓ Anomalies: ${analysis.data?.anomalies?.length ?? 0}, Fraud: ${analysis.data?.fraudAlerts?.length ?? 0}`);
  } catch { console.log('   ⚠ Security analysis skipped'); }

  console.log('\n4. SIEM webhook ingestion...');
  try {
    await request('POST', `${API}/api/v1/security/siem/webhook`, {
      severity: 'high', title: 'Brute force attempt detected', source: 'sentinel',
      hostname: 'web-server', raw: { srcIp: '203.0.113.50', attempts: 150 },
    });
    console.log('   ✓ SIEM event ingested');
  } catch { console.log('   ⚠ SIEM skipped'); }

  console.log('\n5. Remediation runbook match...');
  try {
    const match = await request('POST', `${API}/api/v1/remediation/match`, {
      alertTitle: 'connection pool exhausted', metric: 'db.pool.utilization', value: 98,
    });
    console.log(`   ✓ Matched runbooks: ${match.data?.matches?.length ?? 0}`);
  } catch { console.log('   ⚠ Remediation match skipped'); }

  console.log('\nPhase 3 bootstrap complete.');
  console.log('Open http://localhost:3000/security · /sustainability · /ot');
}

main().catch((e) => { console.error(e.message); process.exit(1); });
