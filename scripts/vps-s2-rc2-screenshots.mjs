/**
 * RC2 observe screenshots via Playwright (Node ESM).
 */
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const OUT = process.env.OUT_DIR || '/evidence/screenshots';
const WEB = process.env.WEB_BASE || 'https://observability360.asoftechinsightz.com';
const TOKEN_FILE = process.env.TOKEN_FILE || '/evidence/ede-enter.json';
const VENDOR_RE = /skywalking|grafana|datadog|new\s*relic|elastic(?:search)?\s*apm|openobserve|splunk|prometheus\s*ui/i;

const pages = [
  ['observe-overview', '/observability'],
  ['observe-applications', '/observability/applications'],
  ['observe-infrastructure', '/observability/infrastructure'],
  ['observe-kubernetes', '/observability/kubernetes'],
  ['observe-logs', '/observability/logs'],
  ['observe-metrics', '/observability/metrics'],
  ['observe-traces', '/observability/traces'],
  ['observe-topology', '/observability/topology'],
  ['observe-databases', '/observability/databases'],
  ['digital-twin', '/twin'],
  ['executive-home', '/dashboard'],
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
  await page.waitForTimeout(1200);
  const dest = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: dest, fullPage: true });
  const body = await page.innerText('body');
  fs.writeFileSync(path.join(OUT, `${name}.txt`), body.slice(0, 4000));
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
