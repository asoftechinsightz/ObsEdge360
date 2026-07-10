# Phase 1 Milestone Notes

## Approval

- Plan approved; ADR-001–008 Accepted; ADR-003 **Option B**
- Rules: `PHASE1_DEVELOPMENT_RULES.md`

## M1 — Topology & pipeline gateway

- `GET/POST /api/v1/cmdb/topology/:type`
- `GET/POST /api/v1/observability/pipeline/sources`
- `POST /api/v1/observability/pipeline/ingest/:sourceId`
- OpenAPI updated in `openapi/trinetra360-v1.yaml`
- Nest Swagger `@ApiOperation` on controllers

## M2 — Agent config / updates

- `GET/PUT /api/v1/discovery/agents/:id/config` (`@Public` + `X-Agent-Key`)
- `GET /api/v1/discovery/agents/:id/updates`
- Heartbeat/metrics unchanged (regression)

## M3 — Scheduler / config-mgmt (Option B)

- **Not** in `docker-compose.prod.yml`
- **Not** proxied by gateway
- README experimental banners on both services
- Sprint 0 API claims qualified

## M4 — Health, auth, CI

- Gateway probes core services; `/ready` `/live` `/version` `/metrics`
- Core microservices expose standard ops endpoints via `mountOpsEndpoints`
- Middleware public: `/forgot-password`, `/reset-password`
- Trivy CRITICAL fails CI

## M5 — Banking360 soft-decouple

- `NEXT_PUBLIC_PACK_BANKING360_ENABLED` (default true)
- Nav hides Banking360 when `false` / `0`

## M6 — Validation

See `PHASE1_TEST_REPORT.md` and `PHASE1_COMPLETION_AUDIT.md` (after validation run).
