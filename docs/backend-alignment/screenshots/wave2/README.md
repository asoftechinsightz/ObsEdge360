# Wave 2 Dashboard Screenshots

Capture after logging in with demo CIO credentials and loading illustrative demo data.

## Steps

1. Deploy Wave 1 gateway + Wave 2 web (or run locally with API + demo pack loaded).
2. Login: `cio@asoftech-global-bank.demo` / `Demo@OpsEdge360!2026`
3. Open `/dashboard`
4. Save screenshots:

| File | Content |
|------|---------|
| `executive-home-full.png` | Full page — four sections |
| `section1-kpis.png` | Executive KPIs grid |
| `section2-domains.png` | Operational domains |
| `section3-intelligence.png` | Risks, services, AI |
| `section4-actions.png` | Recommended actions |
| `trust-bar-cached.png` | Trust bar + Cached badge (refresh twice) |

## Automated capture

Use `scripts/capture-prod-screenshots.mjs` with route `/dashboard` when production is updated.
