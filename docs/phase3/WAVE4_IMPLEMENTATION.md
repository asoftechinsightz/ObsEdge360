# Phase 3 Wave 4 — Implementation

See [SDS-3.4-Topology.md](./sds/SDS-3.4-Topology.md).

## Key paths

- `services/cmdb/src/layout-engine.ts` — force/layered/circular/grid layouts
- `services/cmdb/src/trace-dependency.service.ts` — OTLP span → inferred deps + relationships
- `services/cmdb/src/topology-events.ts` — live event cursor + SSE broadcast
- `services/cmdb/src/topology.service.ts` — multi-layer snapshots + layout persistence
- `services/cmdb/src/cmdb.repository.ts` — blast-radius cache + layer breakdown
- Gateway: `apps/api-gateway/src/cmdb-proxy.controller.ts`
- UI: `apps/web/src/app/topology/page.tsx`
- Migration: `025_topology_live.sql`
