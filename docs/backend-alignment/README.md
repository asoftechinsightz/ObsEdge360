# Backend Alignment — Quick Reference

| Document | Purpose |
|----------|---------|
| [PHASE_3_5_ARCHITECTURE.md](./PHASE_3_5_ARCHITECTURE.md) | Full assessment & migration plan |
| [WAVE_1_IMPLEMENTATION.md](./WAVE_1_IMPLEMENTATION.md) | Backend aggregator, services, contracts |
| [WAVE_2_IMPLEMENTATION.md](./WAVE_2_IMPLEMENTATION.md) | **Frontend migration** — single fetch, widget engine |

## Phase 3.5 at a glance

| Deliverable | Location in doc |
|-------------|-----------------|
| Backend assessment | §1 |
| Frontend/backend gap analysis | §2 |
| Zero-breaking migration plan | §3 |
| Dashboard aggregator design | §4 |
| API contracts & envelope | §5 |
| Configuration model | §6 |
| Feature flags | §7 |
| Role dashboards | §8 |
| Implementation sequence | §18 |

## First implementation wave (when approved)

1. Add types to `packages/shared-types`
2. Extract `ExecutiveDataService` (no route changes)
3. Add `GET /api/v1/dashboard/executive`
4. Feature flag `dashboard.aggregator_v1` for frontend cutover

## Rules

- Do **not** remove `/executive/*` routes
- Do **not** break proxy contracts
- Frontend keeps static nav fallback until `/platform/navigation` ships
- Business thresholds move from React to gateway config
