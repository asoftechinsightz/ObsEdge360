#!/usr/bin/env node
/**
 * OpsEdge360 AI copilot retest
 * Usage: node scripts/opsedge360-copilot-retest.mjs [--gateway URL] [--token JWT]
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
  console.log('OpsEdge360 copilot retest\n');
  if (!token) {
    console.log('No JWT — pass --token or OBS360_TOKEN\n');
    process.exit(1);
  }

  const recs = await req('GET', '/copilot/recommendations');
  checks.push({
    label: 'Recommendations',
    ok: recs.ok && Array.isArray(recs.data?.recommendations),
  });

  const rca = await req('POST', '/copilot/rca', {
    question: 'Why is latency elevated?',
  });
  checks.push({
    label: 'RCA workflow',
    ok: rca.ok && typeof rca.data?.summary === 'string' && rca.data.summary.length > 10,
  });

  const chat = await req('POST', '/copilot/chat', {
    messages: [{ role: 'user', content: 'Give me recommendations' }],
  });
  checks.push({
    label: 'Copilot chat',
    ok: chat.ok && typeof chat.data?.reply === 'string',
  });

  const bankingChat = await req('POST', '/copilot/chat', {
    messages: [{ role: 'user', content: 'How is Banking360 compliance?' }],
  });
  checks.push({
    label: 'Compliance intent',
    ok: bankingChat.ok && bankingChat.data?.reply?.toLowerCase().includes('banking'),
  });

  for (const c of checks) console.log(`[${c.ok ? 'PASS' : 'FAIL'}] ${c.label}`);
  const failed = checks.filter((c) => !c.ok).length;
  if (failed) {
    console.log(`\n${failed} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll copilot checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
