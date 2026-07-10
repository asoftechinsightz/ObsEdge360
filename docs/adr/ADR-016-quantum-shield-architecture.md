# ADR-016: Quantum Shield Architecture

**Decision Status:** Accepted  
**Date:** 2026-07-10 · **Accepted:** 2026-07-11  
**Deciders:** EAB  
**Phase / Release:** Design in Phase 2 · implementation later as **module**  
**Depends on:** ADR-009  

---

## Business Context

Post-quantum readiness is a differentiator, but must not delay core AuthZ/compliance foundations.

## Problem Statement

Quantum-related surfaces exist in vision/repo; coupling them into Phase 2 critical path risks scope distraction and over-claims.

## Decision

1. Quantum Shield is an **optional advanced security module/plugin**, never a hard dependency of core AuthZ.  
2. Phase 2 delivers **architecture/design**: crypto inventory, PQC roadmap, crypto-agility interfaces.  
3. No production dependency from gateway authz on quantum service in `v0.9.2`.  
4. Claims must match maturity.  
5. Permanent rule: implement as module — not tightly coupled into platform core.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| Full PQC in Phase 2 | Blocks basics |
| Remove all quantum mentions | Loses roadmap |
| Gateway depends on quantum service | Availability risk |

## Consequences

**Positive:** Honest roadmap; protects Phase 2 focus.  
**Negative:** Feature remains thin until later investment.

## Security Impact

No reduction of Phase 2 AuthZ scope; avoids false quantum-safe claims.

## Performance Impact

None in `v0.9.2` runtime path.

## Scalability Impact

Module can evolve independently.

## Compliance Impact

Supports future crypto-agility narratives without present over-claim.

## Rollback Strategy

N/A for design-only; if later enabled, disable module flag.

## Future Considerations

PQC TLS experiments, hybrid KEMs, compliance mapping.

## Decision Status

**Accepted** — EAB 2026-07-11 (design-only for `v0.9.2`).  
