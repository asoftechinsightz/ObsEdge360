# ADR-020: Plugin Framework

**Status:** Proposed  
**Date:** 2026-07-10  
**Deciders:** Chief Architect, Security Architect  
**Phase:** 5–6 (primary) — design constraint from Phase 2 onward  
**Depends on:** ADR-001, ADR-009, ADR-014  

---

## Context

Connectors, packs, and future marketplace extensions need a safe plugin model so third parties cannot bypass authz or destabilize core.

## Decision

1. Define a **Plugin Framework**: manifest, version, permissions, entrypoints, sandboxed execution boundaries.  
2. Plugins declare required permissions; gateway/enforcer grants least privilege.  
3. Unsigned or unverified plugins **forbidden** in production.  
4. Core services remain callable only via approved APIs/events — no in-process hooks into auth without review.  
5. Solution/country packs are the first plugin-shaped modules (ADR-024, ADR-025).  
6. Implementation timed with Studio/packs; ADR accepted before coding.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Unrestricted npm packages in prod | Supply-chain / authz risk |
| Fork repo per customer | Unmaintainable |
| Only remote HTTP webhooks | Insufficient for deep widgets/rules |

## Consequences

**Positive:** Marketplace-ready path; security reviewable.  
**Negative:** Upfront design cost; SDK investment.

## Compliance

- Secrets never shipped inside plugin bundles.  
- Vuln process (ADR-018) applies to plugins.  
