# ADR-002: Sprint 0 API Gateway Wiring

**Status:** Proposed  
**Date:** 2026-07-10  
**Deciders:** Solution Architect, Staff Engineer  
**Phase:** 1  

---

## Context

Sprint 0 implemented topology, telemetry pipeline, and agent config/update endpoints on backend services. NestJS API gateway does **not** proxy them. Documentation claims `/api/v1/...` paths that 404 at the edge. Production compose includes discovery, cmdb, and observability — so these routes can be wired safely without new containers.

## Decision

In Phase 1, add **additive** gateway proxy routes for:

| Backend | Gateway path |
|---------|----------------|
| CMDB | `GET /api/v1/cmdb/topology/:type` |
| CMDB | `POST /api/v1/cmdb/topology/:type/refresh` |
| Observability | `GET/POST /api/v1/observability/pipeline/sources` |
| Observability | `POST /api/v1/observability/pipeline/ingest/:sourceId` |
| Discovery | `GET/PUT /api/v1/discovery/agents/:id/config` |
| Discovery | `GET /api/v1/discovery/agents/:id/updates` |

Implementation pattern: extend existing `ProxyService` + dedicated/extended Nest controllers; preserve JWT for user routes; agent routes per ADR-004.

Update Sprint 0 API docs to match reality in the same milestone.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Call microservices directly from agents/UI (bypass gateway) | Breaks API-first, CORS, auth consistency |
| Defer wiring to Phase 3 | Leaves docs/API dishonest; blocks agent framework |
| Rewrite as BFF aggregations | Unnecessary for pass-through; scope creep |

## Consequences

**Positive:** Docs match production path; agent-framework usable via public API; topology usable from console later.  
**Negative:** Slightly larger gateway surface; must keep agent-key auth correct.  
**Risk:** If backend down, gateway returns 502 — acceptable and visible via health probes (ADR-005).

## Compliance

- Additive only; no breaking changes to existing routes.
- No production lock violations.
