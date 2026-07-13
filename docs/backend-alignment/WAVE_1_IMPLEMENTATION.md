# Wave 1 — Implementation Summary

**Status:** Implemented (additive, backward compatible)  
**Date:** 2026-07-13

## What shipped

### Service layer (`apps/api-gateway/src/dashboard/`)

| Service | Responsibility |
|---------|----------------|
| `DashboardController` | HTTP only — `GET /dashboard/executive`, `GET /dashboard/widgets/registry` |
| `DashboardAggregationService` | Orchestration only — parallel domain calls, no business rules |
| `ExecutiveDataService` | Authoritative executive data + widget composition |
| `DashboardRulesService` | All threshold/status calculations |
| `DashboardCacheService` | Namespace TTLs: dashboard, executive, cmdb, compliance, security, ai, … |
| `EstateService` | CMDB stats |
| `ObserveService` | Business services |
| `ComplianceService` | Compliance score enrichment |
| `SecurityService` | Security summary (from KPIs) |
| `NetworkService` | Network summary (from estate stats) |
| `AiInsightService` | Narrative + recommendations |
| `WidgetRegistryService` | Seed widget metadata registry |

### APIs (additive)

| Method | Path | Envelope |
|--------|------|----------|
| GET | `/api/v1/dashboard/executive?role=` | Yes |
| GET | `/api/v1/dashboard/widgets/registry?role=` | Yes |
| GET | `/api/v1/executive/*` | Unchanged (delegates to `ExecutiveDataService`) |

### Shared contracts (`packages/shared-types`)

- `api-envelope.ts` — `ApiEnvelope`, `ResponseMetadata`, `PaginationMeta`
- `widgets.ts` — Health, Domain, Risk, Action, Trend, Chart, Timeline, Topology, Incident, Compliance, Security, Table
- `dashboard.ts` — `ExecutiveDashboardPayload`, `WidgetRegistryEntry`

### Refactor (non-breaking)

- `ExecutiveController` → thin delegate to `ExecutiveDataService`
- KPI cache → `DashboardCacheService` namespace `executive:kpis`

## Architecture alignment (approved enhancements)

1. Aggregator is **service-layer**, not fat controller ✓
2. **ExecutiveDataService** owns calculations ✓
3. **Widget contracts** expanded ✓
4. **Unified envelope** on new dashboard routes ✓ (legacy routes unchanged — Wave 3)
5. **Widget registry** seed ✓ (DB-backed metadata — Wave 4)
6. **Role composition** via `?role=` query + widget metadata filtering ✓
7. **Business rules** in `DashboardRulesService` ✓
8. **Dashboard cache** namespaces with configurable TTL ✓

## Next: Wave 2 (frontend)

1. Feature flag `dashboard.aggregator_v1`
2. `ExecutiveDashboard` → single `GET /dashboard/executive`
3. Remove duplicate client fetches (`kpis`, `trends`, `narrative`)
4. Map widget contracts to EIG components

## Next: Wave 3 (platform config)

- `GET /platform/navigation`
- `GET /platform/tenant-config`
- `GET /platform/features` (flag precedence: global → entitlement → tenant → role → user)

## Validation

```bash
npm run build --workspace=@opsedge360/shared-types
npm run lint --workspace=@opsedge360/api-gateway
```

Example:

```http
GET /api/v1/dashboard/executive?role=cio
Authorization: Bearer <token>
```

Returns `ApiEnvelope<ExecutiveDashboardPayload>` with `metadata.cacheHit`, `metadata.dataMode`, `metadata.widgetRegistryVersion`.
