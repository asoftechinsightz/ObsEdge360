# ADR-024: Industry Solution Pack Framework

**Status:** Proposed  
**Date:** 2026-07-10  
**Deciders:** Product Owner, Chief Architect  
**Phase:** 5 (primary); policy already frozen in ADR-001  
**Depends on:** ADR-001, ADR-012, ADR-020  

---

## Context

Banking360 and future verticals must remain **optional packs**, not core. A formal pack framework is required for install, enablement, versioning, and cleanup.

## Decision

1. **Solution Pack** = versioned bundle: metadata, UI routes/widgets, compliance rules, connectors config, seeds (optional), permissions.  
2. Core boots and operates with **zero packs** installed.  
3. Enablement via config/feature flag / pack registry (Phase 1 soft flag for Banking360 is interim).  
4. Packs may not patch core auth or bypass gateway.  
5. Pack APIs namespaced; DB objects prefixed or schema-isolated as designed in Phase 5 LLD.  
6. Marketplace distribution later via Plugin Framework (ADR-020).

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Banking in core | Violates frozen vision |
| Separate products per industry | Duplicates platform cost |
| Compile-time only packs | Poor customer enablement |

## Consequences

**Positive:** Global multi-industry platform.  
**Negative:** Pack SDK and CI matrix complexity.

## Compliance

- `INDUSTRY_SOLUTION_PACKS.md` · ADR-001.  
