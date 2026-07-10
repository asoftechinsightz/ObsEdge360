# ADR-012: Compliance Rule Engine

**Decision Status:** Accepted  
**Date:** 2026-07-10 · **Accepted:** 2026-07-11  
**Deciders:** EAB  
**Phase / Release:** Phase 2 · `v0.9.2` (foundation)  
**Depends on:** ADR-009, ADR-013  

---

## Business Context

Enterprises need policy evaluation and evidence collection without hardcoding industry or country law into the core platform.

## Problem Statement

Compliance service exists, but a durable metadata-driven rule/evidence model is incomplete. Risk of over-claiming certification automation.

## Decision

1. Metadata-driven model: framework → control → rule → evidence → result.  
2. Core engine industry-agnostic; packs supply rules (ADR-024/025).  
3. Phase 2 delivers **foundation**: schema, evaluation API, audited runs, risk scoring framework hooks.  
4. Full framework coverage spans later releases; no false “certified” claims.  
5. Rules versioned; evaluations immutable once recorded.  
6. Implemented as a **module/service**, not entangled UI/business logic in gateway core.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| Hardcode banking rules in core | Violates pack policy |
| Delay all compliance work | Blocks security narrative |
| External GRC only | Weak product differentiator |

## Consequences

**Positive:** Pack-friendly compliance path.  
**Negative:** Scope creep — time-box to foundation.

## Security Impact

Evaluation APIs RBAC-gated; evidence may contain sensitive metadata — classify and restrict.

## Performance Impact

Batch evaluations may be heavy — async jobs for large frameworks.

## Scalability Impact

Rule packs versioned independently; engine scales with compliance service replicas.

## Compliance Impact

Foundation for evidence collection and policy engine; not a substitute for legal certification.

## Rollback Strategy

Disable new evaluation endpoints; retain tables; prior compliance APIs remain.

## Future Considerations

Country packs, continuous control monitoring, auditor export packages.

## Decision Status

**Accepted** — EAB 2026-07-11 (foundation scope).  
