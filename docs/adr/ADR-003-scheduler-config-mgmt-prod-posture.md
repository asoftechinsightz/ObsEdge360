# ADR-003: Scheduler and Config-Management Production Posture

**Status:** Accepted  
**Date:** 2026-07-10  
**Deciders:** DevOps Architect, Chief Architect, Product Owner  
**Phase:** 1  
**Selected option:** **B**

---

## Context

`services/scheduler` (:4011) and `services/config-management` (:4012) exist with migration 015 tables, but are **absent** from `docker-compose.prod.yml` and gateway. Docs imply they are Sprint 0 complete. Shipping gateway routes without containers causes production 502s. Adding containers increases ops surface.

## Decision

**Option B — Explicitly non-production (Accepted 2026-07-10)**

- Do **not** add to prod compose in Phase 1.
- Do **not** add gateway routes for scheduler/config-mgmt in Phase 1.
- Mark services `experimental` / `lab` in README and Sprint 0 docs.
- Remove or qualify API claims that imply production availability.
- Revisit promotion in Phase 2 or early Phase 3 after security hardening.

### Option A — Deferred (not selected)

- Add both services to `docker-compose.prod.yml` and gateway — deferred beyond Phase 1.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Gateway routes without compose services | Guaranteed 502s in prod |
| Silent leave as-is | Documentation dishonesty |

## Consequences

**Option A:** More complete Sprint 0; higher deploy risk/effort.  
**Option B:** Honest posture; defers ops load; agents/topology/pipeline still ship via ADR-002.

## Compliance

- Migration 015 remains additive via existing migrate job regardless of option.
- Production locks unchanged.
