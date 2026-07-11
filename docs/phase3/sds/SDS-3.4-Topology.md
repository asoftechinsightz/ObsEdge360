# SDS-3.4 — Topology (Live Operational Graph)

**Document ID:** OE360-SDS-3.4  
**Wave:** Phase 3 / Wave 4  
**Release:** `v0.9.3`  
**Status:** ✅ CLOSED — production validated (`v0.9.3-wave4`)  
**Depends on:** Wave 3 closed (`v0.9.3-wave3`)

## Objectives

Turn the static CMDB topology foundation into a **live operational graph**:

1. **Trace-derived dependencies** — infer `calls` / service edges from `otlp_spans` into `inferred_dependencies` and CMDB relationships  
2. **Interactive layouts** — force-directed / layered auto-layout with persisted node positions  
3. **Blast-radius analysis** — cached multi-direction BFS with layer-aware impact  
4. **Multi-layer visualization** — application, infrastructure, Kubernetes, cloud, network, service  
5. **Live updates** — topology events from discovery (`cmdb.updated` / `twin.updated`) and trace sync; SSE/poll cursor for UI  

## Non-goals (defer)

- Full Neo4j-first graph rewrite  
- AI RCA / predictive ops (Phase later)  
- Breaking changes to `/api/v1/cmdb/topology/:type` or `/api/v1/twin/*`

## Migration

**025** — `inferred_dependencies`, `topology_layout_positions`, `blast_radius_cache`, `topology_events`; layout columns on `topology_nodes`.

## APIs (additive)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/cmdb/topology/sync-traces` | Reconcile span edges → inferred deps + relationships |
| GET | `/api/v1/cmdb/topology/dependencies` | List inferred dependencies |
| POST | `/api/v1/cmdb/topology/:type/layout` | Compute + persist layout |
| GET | `/api/v1/cmdb/topology/layers` | Layer catalog + node counts |
| GET | `/api/v1/cmdb/topology/events` | Live event cursor (poll) |
| GET | `/api/v1/cmdb/topology/live` | SSE stream of topology events |
| GET | `/api/v1/twin/blast-radius/:ciId` | Existing + cache |

## Acceptance

**P3_WAVE4_VALIDATION_OK** in production.

## UI

`/topology` — interactive multi-layer topology viewer with blast-radius panel and live refresh.
