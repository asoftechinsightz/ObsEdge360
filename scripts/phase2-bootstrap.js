#!/usr/bin/env node
/**
 * Phase 2 bootstrap: migrate DB, run compliance validation, discovery scan, sample trace discovery.
 */
const http = require('http');

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const DISCOVERY = process.env.DISCOVERY_URL ?? 'http://localhost:4001';

function request(method, url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
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
  console.log('OpsEdge360 Phase 2 Bootstrap\n');

  console.log('1. Running database migrations...');
  require('child_process').execSync('node database/migrations/run.js', { stdio: 'inherit' });

  console.log('\n2. Running compliance validation...');
  try {
    const validation = await request('POST', `${API}/api/v1/compliance/validate`, {});
    console.log(`   ✓ Compliance score: ${validation.data?.overallScore ?? 'N/A'}%`);
    console.log(`   ✓ Violations: ${validation.data?.violations?.length ?? 0}`);
  } catch (e) {
    console.log('   ⚠ Compliance validation skipped (API not ready)');
  }

  console.log('\n3. Running discovery scan (includes SNMP)...');
  try {
    const scan = await request('POST', `${DISCOVERY}/scan`, {});
    console.log(`   ✓ Discovery results: ${JSON.stringify(scan.data?.results?.length ?? scan.data?.assetsDiscovered ?? 'ok')}`);
  } catch (e) {
    console.log('   ⚠ Discovery scan skipped');
  }

  console.log('\n4. Discovering UPI transaction from sample trace...');
  try {
    const trace = await request('POST', `${API}/api/v1/transactions/discover`, {
      name: 'upi.payment.process',
      spans: [
        { name: 'Customer', durationMs: 12 },
        { name: 'Mobile App', durationMs: 45 },
        { name: 'API Gateway', durationMs: 8 },
        { name: 'Authentication', durationMs: 120 },
        { name: 'Payment Service', durationMs: 890 },
        { name: 'Database', durationMs: 34 },
        { name: 'NPCI Switch', durationMs: 210 },
      ],
    });
    console.log(`   ✓ Transaction: ${trace.data?.name ?? 'created'}`);
  } catch (e) {
    console.log('   ⚠ Transaction discovery skipped');
  }

  console.log('\n5. Ingesting sample NetFlow data...');
  try {
    await request('POST', `${API}/api/v1/network/flows`, {
      flows: [
        { srcIp: '10.0.2.10', dstIp: '10.0.2.20', srcPort: 443, dstPort: 5432, protocol: 'TCP', bytes: 524288, latencyMs: 1.8, packetLossPct: 0.01 },
      ],
    });
    console.log('   ✓ NetFlow ingested');
  } catch (e) {
    console.log('   ⚠ NetFlow ingestion skipped');
  }

  console.log('\nPhase 2 bootstrap complete.');
  console.log('Open http://localhost:3000/transactions for business flow mapping.');
}

main().catch((err) => {
  console.error('Bootstrap failed:', err.message);
  process.exit(1);
});
