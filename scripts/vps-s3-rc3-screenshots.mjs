/**
 * Sprint 3 RC3 Twin BSI screenshots via Playwright.
 */
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const OUT = process.env.OUT_DIR || '/evidence/screenshots';
const WEB = process.env.WEB_BASE || 'https://observability360.asoftechinsightz.com';
const TOKEN_FILE = process.env.TOKEN_FILE || '/evidence/ede-enter.json';
const SELECTED = process.env.SELECTED_SERVICE || '/evidence/selected-service.json';
const VENDOR_RE =
  /skywalking|grafana|datadog|new\s*relic|elastic(?:search)?\s*apm|openobserve|splunk|prometheus\s*ui|\botlp\b/i;

let serviceQuery = '';
try {
  const svc = JSON.parse(fs.readFileSync(SELECTED, 'utf8'));
  if (svc?.id) {
    serviceQuery = `?workflow=impact&serviceId=${encodeURIComponent(svc.id)}&name=${encodeURIComponent(svc.name || '')}`;
  }
} catch {
  serviceQuery = '?workflow=impact&name=UPI';
}

const pages = [
  ['executive-home', '/dashboard'],
  ['digital-twin', '/twin'],
  ['digital-twin-service', `/twin${serviceQuery}`],
  ['observability', '/observability'],
  ['ops-intelligence', '/ops-intelligence'],
  ['executive-reports', '/reports'],
];

fs.mkdirSync(OUT, { recursive: true });
const token = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')).accessToken;
if (!token) {
  console.error('MISSING_TOKEN');
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  ignoreHTTPSErrors: true,
});
await context.addCookies([
  {
    name: 'oe360_token',
    value: token,
    domain: 'observability360.asoftechinsightz.com',
    path: '/',
    httpOnly: false,
    secure: true,
    sameSite: 'Lax',
  },
]);
const page = await context.newPage();
const fails = [];

for (const [name, route] of pages) {
  await page.goto(WEB + route, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1500);
  if (name === 'digital-twin-service') {
    // Attempt blast radius click if visible
    const btn = page.getByRole('button', { name: /blast radius/i });
    if (await btn.count()) {
      await btn.first().click().catch(() => {});
      await page.waitForTimeout(2000);
    }
  }
  const dest = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: dest, fullPage: true });
  const body = await page.innerText('body');
  fs.writeFileSync(path.join(OUT, `${name}.txt`), body.slice(0, 5000));
  if (VENDOR_RE.test(body)) {
    fails.push(name);
    console.log('FAIL vendor_leak', name);
  } else {
    console.log('CAPTURED', name, '->', dest);
  }
}

await browser.close();
const summary = `pages=${pages.length} fails=${fails.length} fails_list=${JSON.stringify(fails)}\n`;
fs.writeFileSync(path.join(OUT, 'capture-summary.txt'), summary);
console.log('SCREENSHOTS_DONE', summary.trim());
if (fails.length) process.exit(2);
