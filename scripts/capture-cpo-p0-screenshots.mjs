#!/usr/bin/env node
/**
 * Capture CIO 3-minute Wow path screenshots via Playwright against production.
 * Usage: node scripts/capture-cpo-p0-screenshots.mjs
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.OE360_WEB_URL || 'https://observability360.asoftechinsightz.com';
const API = process.env.OE360_API_URL || 'https://api.observability360.asoftechinsightz.com';
const OUT = path.join(__dirname, '..', 'docs', 'cpo-polish', 'screenshots');

const PAGES = [
  { name: '01-login', path: '/login' },
  { name: '02-executive-home', path: '/dashboard' },
  { name: '03-guided', path: '/demo/guided' },
  { name: '04-drift', path: '/cmdb/drift' },
  { name: '05-twin', path: '/twin' },
  { name: '06-topology', path: '/topology' },
  { name: '07-banking360', path: '/banking360' },
  { name: '08-security', path: '/security' },
  { name: '09-reports', path: '/reports' },
  { name: '10-cmdb', path: '/cmdb' },
  { name: '11-discovery', path: '/discovery' },
  { name: '12-itsm', path: '/itsm' },
];

async function enterDemo(page) {
  const res = await page.request.post(`${API}/api/v1/demo/ede/enter`, {
    data: {},
    headers: { 'Content-Type': 'application/json' },
  });
  const body = await res.json();
  if (!body.accessToken) throw new Error(`demo enter failed: ${JSON.stringify(body).slice(0, 200)}`);
  await page.context().addCookies([
    {
      name: 'oe360_token',
      value: encodeURIComponent(body.accessToken),
      domain: new URL(BASE).hostname,
      path: '/',
    },
  ]);
  return body.accessToken;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.screenshot({ path: path.join(OUT, '01-login.png'), fullPage: true });

  await enterDemo(page);

  for (const step of PAGES.slice(1)) {
    await page.goto(`${BASE}${step.path}`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(OUT, `${step.name}.png`), fullPage: true });
    console.log('captured', step.name);
  }

  await browser.close();
  fs.writeFileSync(
    path.join(OUT, 'README.md'),
    `# CPO polish screenshots\n\nCaptured ${new Date().toISOString()} against ${BASE}\n\n` +
      PAGES.map((p) => `- ${p.name}.png — ${p.path}`).join('\n') +
      '\n',
  );
  console.log('DONE', OUT);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
