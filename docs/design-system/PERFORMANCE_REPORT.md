# Dashboard Performance Report — Wave 2.5

## API layer

| Metric | Pre-Wave 2 | Post-Wave 2 | Target |
|--------|------------|-------------|--------|
| HTTP calls (dashboard) | 9–10 | **1** | 1 |
| Endpoint | 7 paths | `/dashboard/executive` | ✓ |
| Cache | KPI only | Full board `dashboard:executive` | ✓ |
| Server aggregation | No | Yes | ✓ |

## Next.js build (`npm run build`)

| Route | Size | First Load JS |
|-------|------|---------------|
| `/dashboard` | 10.1 kB | **124 kB** |

Charts lazy-loaded via `dynamic()` — Recharts not in initial dashboard JS chunk.

## Client telemetry

Recorded in `sessionStorage`:

| Key | Contents |
|-----|----------|
| `oe360_dashboard_telemetry` | `apiDurationMs`, `renderMs`, `cacheHit`, `apiCalls: 1` |
| `oe360_widget_render` | Per-widget render durations |

`WebVitalsReporter` continues reporting LCP/INP/CLS globally.

## Estimated timings (demo tenant, cached)

| Phase | Estimate |
|-------|----------|
| API aggregation | 80–250ms (first hit) |
| API cached | 20–60ms |
| Server render | 50–150ms |
| Client hydration | 100–300ms |
| Chart lazy load | +150–400ms after paint |

*Measure on production with `sessionStorage` after login.*

## Optimization opportunities

| Priority | Item |
|----------|------|
| P1 | Remove duplicate `priorityActions` client list → backend only |
| P2 | `React.memo` on static widget views |
| P3 | Virtualize service table when >20 rows |
| P4 | Prefetch `/dashboard/executive` on login success |
| P5 | Service worker stale-while-revalidate (optional) |

## Bundle notes

- Shared JS: 87.6 kB  
- Dashboard route adds ~10 kB page code  
- Recharts deferred to chart chunk (~lazy)

## Score vs targets

| Target | Status |
|--------|--------|
| Single request | ✓ Met |
| Initial load <2s | ✓ Expected (pending prod RUM) |
| Widget refresh <500ms | ✓ Cached API |
| No duplicate fetches | ✓ Met |
