# Sprint 0 — Enterprise Foundation Implementation

**Branch:** `feature/sprint0-enterprise-foundation`  
**Status:** Implementation complete (backend foundation)  
**Production:** Locked — no changes to production routing, volumes, SSL, or existing migrations 001–014

## Modules Delivered

| Module | Location | Status |
|--------|----------|--------|
| 1. Universal Agent Framework | `packages/agent-framework`, `agents/*` | Complete |
| 2. Discovery Engine v2 | `services/discovery/src/connectors/*` | Complete |
| 3. OpenTelemetry Platform | `services/observability` (OTLP HTTP, metrics, traces) | Extended |
| 4. Telemetry Pipeline | `services/observability/src/telemetry-pipeline.service.ts` | Complete |
| 5. CMDB Foundation | `services/cmdb`, migration 015 | Extended |
| 6. Topology Engine | `services/cmdb/src/topology.service.ts` | Complete |
| 7. Plugin SDK | `packages/plugin-sdk` | Complete |
| 8. Security Foundation | `packages/shared-security`, migration 015 | Complete |
| 9. Enterprise Scheduler | `services/scheduler` | Complete |
| 10. Configuration Management | `services/config-management` | Complete |

## Shared Foundation Packages

- `@opsedge360/shared-logger` — Structured JSON logging with correlation/trace IDs
- `@opsedge360/agent-framework` — Agent client, offline queue, compression, config sync, plugins, updates
- `@opsedge360/shared-security` — RBAC, ABAC, API keys, rate limiting, audit logs
- `@opsedge360/plugin-sdk` — Multi-runtime plugin lifecycle and manifest validation

## Database

New migration: `015_sprint0_enterprise_foundation.sql`  
Tables: roles, user_roles, api_keys, abac_policies, audit_logs, agent_config_history, ci_config_history, ci_config_drift, topology_snapshots, scheduler_jobs, scheduler_job_runs, scheduler_dead_letter, config_templates, config_deployments, telemetry_sources, plugin_registry

## API Additions (backward compatible)

All new routes are additive under existing services:

- `GET/PUT /discovery/agents/:id/config`
- `GET /discovery/agents/:id/updates`
- `GET/POST /observability/pipeline/sources`
- `POST /observability/pipeline/ingest/:sourceId`
- `GET/POST /cmdb/topology/:type`
- `POST /cmdb/topology/:type/refresh`
- `GET/POST /scheduler/jobs`
- `GET /scheduler/dead-letter`
- `GET/POST /config-management/templates`
- `POST /config-management/deploy`
- `POST /config-management/deployments/:id/rollback`

## Validation Commands

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
docker compose build
```

## Commit Strategy

Per-module commits on `feature/sprint0-enterprise-foundation` — never `main`.
