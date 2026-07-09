#!/usr/bin/env node
/**
 * Phase 1 bootstrap: verify DB, trigger discovery scan.
 * Run after: docker compose up -d && npm run db:migrate
 */
const http = require('http');

const DISCOVERY_URL = process.env.DISCOVERY_URL ?? 'http://localhost:4001';

function request(method, url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': 'default',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw || '{}') });
        } catch {
          resolve({ status: res.statusCode, data: raw });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log('OpsEdge360 Phase 1 Bootstrap\n');

  console.log('1. Checking discovery service...');
  const health = await request('GET', `${DISCOVERY_URL}/health`);
  if (health.status !== 200) {
    console.error('Discovery service not ready. Start with: npm run dev');
    process.exit(1);
  }
  console.log('   ✓ Discovery healthy');

  console.log('2. Running discovery scan (all connectors)...');
  const scan = await request('POST', `${DISCOVERY_URL}/scan`, {});
  console.log('   ✓ Scan result:', JSON.stringify(scan.data, null, 2).slice(0, 500));

  console.log('\n3. Checking CMDB...');
  const cmdbUrl = process.env.CMDB_URL ?? 'http://localhost:4002';
  const cis = await request('GET', `${cmdbUrl}/cis`);
  console.log(`   ✓ CMDB has ${cis.data?.total ?? 0} configuration items`);

  console.log('\nPhase 1 bootstrap complete.');
  console.log('Open http://localhost:3000 for the executive dashboard.');
}

main().catch((err) => {
  console.error('Bootstrap failed:', err.message);
  process.exit(1);
});
