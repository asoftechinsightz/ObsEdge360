#!/usr/bin/env node
/**
 * Wave 2.5 design benchmark screenshots — demo CIO tenant with illustrative data.
 * Usage: node scripts/capture-wave25-screenshots.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const API = process.env.API_BASE || 'https://api.observability360.asoftechinsightz.com/api/v1';
const WEB = process.env.WEB_BASE || 'https://observability360.asoftechinsightz.com';
const OUT = process.env.OUT_DIR || path.join(process.cwd(), 'docs', 'design-system', 'screenshots');

fs.mkdirSync(OUT, { recursive: true });

async function demoToken() {
  const enter = await fetch(`${API}/demo/ede/enter`, { method: 'POST' });
  const data = await enter.json();
  if (data.accessToken) return data.accessToken;
  const login = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'cio@asoftech-global-bank.demo',
      password: 'Demo@OpsEdge360!2026',
    }),
  });
  const auth = await login.json();
  if (!auth.accessToken) {
    console.error('AUTH_FAILED', enter.status, login.status, auth);
    process.exit(1);
  }
  return auth.accessToken;
}

const token = await demoToken();
console.log('demo_auth_ok');

const browser = await chromium.launch({ headless: true });
const host = new URL(WEB).hostname;

const shots = [
  ['01-login', async (page) => {
    await page.goto(`${WEB}/login`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, '01-login-dark.png'), fullPage: false });
  }],
  ['02-dashboard-full', async (page) => {
    await page.goto(`${WEB}/dashboard`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(OUT, '02-dashboard-full-dark.png'), fullPage: true });
  }],
  ['03-dashboard-header', async (page) => {
    await page.goto(`${WEB}/dashboard`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(2000);
    await page.locator('header').first().screenshot({ path: path.join(OUT, '03-header-dark.png') });
  }],
  ['04-sidebar', async (page) => {
    await page.goto(`${WEB}/dashboard`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(2000);
    await page.locator('aside').first().screenshot({ path: path.join(OUT, '04-sidebar-dark.png') });
  }],
  ['05-kpis', async (page) => {
    await page.goto(`${WEB}/dashboard`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(2000);
    const section = page.locator('section').filter({ has: page.locator('#exec-kpis') }).first();
    if (await section.count()) await section.screenshot({ path: path.join(OUT, '05-health-kpis-dark.png') });
  }],
  ['06-domains', async (page) => {
    await page.goto(`${WEB}/dashboard`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(2000);
    const section = page.locator('section').filter({ has: page.locator('#ops-domains') }).first();
    if (await section.count()) await section.screenshot({ path: path.join(OUT, '06-operational-domains-dark.png') });
  }],
  ['07-intelligence', async (page) => {
    await page.goto(`${WEB}/dashboard`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(2000);
    const section = page.locator('section').filter({ has: page.locator('#ops-intel') }).first();
    if (await section.count()) await section.screenshot({ path: path.join(OUT, '07-ai-insights-dark.png') });
  }],
  ['08-actions', async (page) => {
    await page.goto(`${WEB}/dashboard`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(2000);
    const section = page.locator('section').filter({ has: page.locator('#actions') }).first();
    if (await section.count()) await section.screenshot({ path: path.join(OUT, '08-recommended-actions-dark.png') });
  }],
  ['09-laptop', async (page) => {
    await page.goto(`${WEB}/dashboard`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT, '09-dashboard-laptop-dark.png'), fullPage: true });
  }, { viewport: { width: 1280, height: 800 } }],
  ['10-light', async (page) => {
    await page.goto(`${WEB}/dashboard`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, '10-dashboard-light.png'), fullPage: true });
  }],
];

for (const item of shots) {
  const [name, fn, opts = {}] = item;
  const context = await browser.newContext({
    viewport: opts.viewport ?? { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });
  await context.addCookies([
    { name: 'oe360_token', value: token, domain: host, path: '/', secure: true, sameSite: 'Lax' },
  ]);
  const page = await context.newPage();
  await fn(page);
  await context.close();
  console.log('captured', name);
}

await browser.close();
console.log('OUT', OUT);
