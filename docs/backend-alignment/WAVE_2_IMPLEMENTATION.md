# Wave 2 — Executive Dashboard Frontend Migration

**Status:** Implemented  
**Date:** 2026-07-13

## Summary

Executive Home (`/dashboard`) now hydrates from a **single** aggregated API:

```
GET /api/v1/dashboard/executive?role={role}
```

All duplicate client/server fetches to `/executive/*` and `/cmdb/stats` on the dashboard route have been removed.

---

## Architecture

```
dashboard/page.tsx
    └── ExecutiveDashboard (server)
            └── fetchDashboardExecutive()  ← 1 API call
            └── ExecutiveDashboardClient (client)
                    ├── ExecutiveBriefing (narrative — props only)
                    ├── Widget views (contract-driven)
                    ├── ChartWidgetsLazy (dynamic import)
                    └── useDashboardRenderTelemetry
```

### Key files

| File | Role |
|------|------|
| `lib/dashboard-api.ts` | Envelope fetch + role from JWT |
| `lib/dashboard-layout.ts` | Layout slots (no JSX positions) |
| `components/dashboard/ExecutiveDashboardClient.tsx` | Four-section layout |
| `components/dashboard/widgets/WidgetViews.tsx` | Contract renderers |
| `components/dashboard/WidgetRenderer.tsx` | Contract dispatcher |
| `hooks/useDashboardTelemetry.ts` | Load/render instrumentation |

---

## Performance comparison

| Metric | Before (Wave 1 UI) | After (Wave 2) |
|--------|-------------------|----------------|
| **Unique API endpoints** | 7 (`/executive/kpis`, `/trends`, `/services`, `/risks`, `/recommendations`, `/narrative`, `/cmdb/stats`) | **1** (`/dashboard/executive`) |
| **HTTP calls per page load** | 9–10 (6 server parallel + 2–3 client duplicates) | **1** server |
| **Business logic in React** | Thresholds, domain health, risk heuristics | **None** — display only |
| **Chart data source** | Client `useEffect` → `/executive/trends` | Payload `charts` + lazy render |
| **Narrative source** | Client `useEffect` → `/executive/narrative` | Payload `narrative` |
| **Cache awareness** | Partial (KPI only) | `metadata.cacheHit` badge |

### Targets (measure in browser DevTools)

| Target | How to measure |
|--------|----------------|
| Single dashboard request | Network tab: 1 call to `dashboard/executive` |
| Dashboard load time | `sessionStorage` key `oe360_dashboard_telemetry` |
| Widget render time | `oe360_widget_render` in sessionStorage |
| TTI / LCP | Lighthouse on `/dashboard` after demo login |

Telemetry events are recorded client-side via `useDashboardRenderTelemetry` and `markWidgetRender`.

---

## Widget contracts rendered

- HealthWidget → `MetricCard`
- DomainWidget → `DomainCard` (status, trend, critical/warning from SecurityWidget when domain is Security)
- RiskWidget → risk panel
- RecommendationWidget → AI panel
- SecurityWidget / ComplianceWidget → intelligence side cards
- TableWidget → affected services
- IncidentWidget → recent incidents
- ActionWidget → action grid
- ChartWidget → lazy Recharts (no fetch)

---

## States

| State | Component |
|-------|-----------|
| Loading | Server suspense boundary / skeleton (DashboardLoadingState available) |
| Empty | DemoAwareEmptyState |
| Error | DashboardErrorState |
| Cached | DashboardCachedBadge when `metadata.cacheHit` |

---

## Deprecated (no API calls)

- `ExecutiveHomeApex` — props-only wrapper around `ExecutiveBriefing`
- `ExecutiveTrendCharts` / `SlaChart` — require `charts` prop; no self-fetch
- Legacy `KpiGrid`, `RiskList`, etc. — unused on `/dashboard`

---

## Screenshots

Capture after demo login (`cio@asoftech-global-bank.demo`):

1. Full executive dashboard — four sections visible
2. Section 1 KPI grid with sparklines
3. Section 3 intelligence row
4. Cached badge + trust bar with illustrative label

Save to: `docs/backend-alignment/screenshots/wave2/`

---

## Validation

```bash
npm run build --workspace=@opsedge360/shared-types
npm run lint --workspace=@opsedge360/web
npm run build --workspace=@opsedge360/web
```

Legacy `/executive/*` routes remain available for other consumers.

---

## Not in scope (Wave 3+)

- `/platform/navigation`
- `/platform/tenant-config`
- Tier-A page redesign
- SSE widget subscribe()
