# Wave 2.5 Screenshot Benchmark

**Last capture:** 2026-07-13 (production, post-deploy `ab97beb`)

Capture after Wave 1 gateway + Wave 2 web are deployed to production.

## Command

```bash
node scripts/capture-wave25-screenshots.mjs
```

Environment overrides:

```bash
API_BASE=https://api.observability360.asoftechinsightz.com/api/v1
WEB_BASE=https://observability360.asoftechinsightz.com
OUT_DIR=docs/design-system/screenshots
```

## Expected files

| File | Content |
|------|---------|
| `01-login-dark.png` | Login page |
| `02-dashboard-full-dark.png` | Full executive dashboard |
| `03-header-dark.png` | Shell header |
| `04-sidebar-dark.png` | Domain sidebar |
| `05-health-kpis-dark.png` | Executive health section |
| `06-operational-domains-dark.png` | Domain cards |
| `07-ai-insights-dark.png` | Intelligence row |
| `08-recommended-actions-dark.png` | Action grid |
| `09-dashboard-laptop-dark.png` | 1280×800 viewport |
| `10-dashboard-light.png` | Light theme toggle |

## Prerequisites

- Playwright installed (`npx playwright install chromium`)  
- Demo pack loaded on `asoftech-global-bank-demo` tenant  
- `/dashboard/executive` aggregator deployed (Wave 1)

## Note

If production has not yet received Wave 1–2 deploy, screenshots will show legacy multi-fetch UI. Re-capture after deploy.
