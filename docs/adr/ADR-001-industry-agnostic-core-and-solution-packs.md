# ADR-001: Industry-Agnostic Core and Solution Packs

**Status:** Proposed  
**Date:** 2026-07-10  
**Deciders:** Product Owner, Chief Architect  
**Phase:** 1 (policy + soft-decouple); full pack runtime in Phase 5  

---

## Context

OpsEdge360 aims to be a globally deployable enterprise platform. Banking360 is currently presented as a first-class console module and BFSI-oriented APIs/seeds are embedded in the monorepo. Treating Banking360 as **core** would force non-banking customers to carry BFSI UX and release coupling.

Stakeholder modification to Phase 0 approval: keep Banking360 as an **optional industry pack**; core must remain industry-agnostic.

## Decision

1. **Core platform** is industry-agnostic (discovery, CMDB, observability, security, compliance engine, tenancy, APIs).
2. **Banking360** (and future verticals) are **Solution Packs** — optional, tenant-enableable modules.
3. **Phase 1** implements **soft-decouple** only:
   - Document pack policy (`INDUSTRY_SOLUTION_PACKS.md`).
   - Introduce feature flag `PACK_BANKING360_ENABLED` (default `true` for backward compatibility).
   - Conditionally render Banking360 nav when flag is true.
4. **Do not** delete banking DB objects or `/banking360` APIs in Phase 1 (avoid breaking existing tenants).
5. **Phase 5** delivers full pack manifests, enable/disable UX, and metadata-driven packs.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Keep Banking360 as required core | Blocks global/non-BFSI positioning |
| Remove Banking360 entirely in Phase 1 | Breaks existing demos/tenants; too destructive |
| Separate microservice per industry | Violates DRY; operational explosion |

## Consequences

**Positive:** Clear global product story; safer multi-industry roadmap; aligns with frozen vision.  
**Negative:** Temporary dual state (pack policy + legacy routes) until Phase 5.  
**Neutral:** Default flag `true` preserves current UX until operators opt out.

## Compliance

- Must not make gateway boot depend on Banking360 controllers.
- Compliance **engine** stays core; banking **controls content** treated as pack data.

## Related

- `docs/governance/INDUSTRY_SOLUTION_PACKS.md`
- `docs/governance/FROZEN_PRODUCT_VISION.md`
