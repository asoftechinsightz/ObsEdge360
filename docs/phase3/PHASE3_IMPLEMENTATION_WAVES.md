# Phase 3 — Implementation Waves

**Release:** `v0.9.3` Enterprise Observability Platform (Core Observability)  
**Strategy:** Deliver by **capability workstream**, one wave at a time.  
**Cadence:** SDS → implement → test → VPS deploy → validate → docs/tag → EAB closure → next wave.  
**Depends on:** Phase 2 closed (`v0.9.2-wave7`)

| Wave | WBS | Focus | SDS |
|------|-----|-------|-----|
| 1 | 3.1 | Telemetry Platform | [SDS-3.1-TelemetryPlatform.md](./sds/SDS-3.1-TelemetryPlatform.md) — **Closed** (`v0.9.3-wave1`) |
| 2 | 3.2 | Universal Agent | [SDS-3.2-UniversalAgent.md](./sds/SDS-3.2-UniversalAgent.md) — **Implementing** |
| 3 | 3.3 | Discovery & CMDB Depth | Planned |
| 4 | 3.4 | Topology | Planned |
| 5 | 3.5 | Operations Intelligence | Planned |
| 6 | 3.6 | Operations Dashboards | Planned |

**EAB (2026-07-11):** Phase 3 theme = Core Observability Platform. Security foundation complete; shift to product-differentiating observability.

## Engineering rules (binding)

1. No breaking API changes to existing `/api/v1/observability/*` contracts.  
2. Tenant isolation + AuthZ from Phase 2 remain mandatory.  
3. Telemetry ingest must be rate-limited and quality-validated.  
4. Every new API requires OpenAPI documentation.  
5. Multi-tenant isolation preserved on all telemetry queries.  
6. Prefer OpenTelemetry semantic conventions.  
7. Production validation required before wave closure.
