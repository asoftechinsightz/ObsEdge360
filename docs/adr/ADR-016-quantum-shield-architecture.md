# ADR-016: Quantum Shield Architecture

**Status:** Proposed  
**Date:** 2026-07-10  
**Deciders:** Chief Architect, Security Architect, Product Owner  
**Phase:** 2 (architecture only / non-blocking) · deeper delivery later  
**Depends on:** ADR-009  

---

## Context

A quantum-related service/surface exists in the monorepo vision. Enterprise buyers may ask about post-quantum readiness, but Phase 2 core must prioritize RBAC, tenancy, audit, and secrets. Over-building Quantum Shield now risks scope distraction.

## Decision

1. **Quantum Shield** is an **optional advanced security capability**, not a Phase 2 exit blocker.  
2. Phase 2 ADR defines intent: inventory crypto usage (TLS, JWT, data-at-rest), document PQC roadmap, keep quantum service **out of critical prod path** unless separately accepted.  
3. No production dependency from core authz on quantum service in Phase 2.  
4. Future work: PQC algorithms for selected channels, crypto-agility interfaces, compliance mapping.  
5. Claims in docs/UI must match implemented maturity (no false “quantum-safe production” claims).

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Full PQC rollout in Phase 2 | Blocks security basics; immature ops |
| Remove all quantum mentions | Loses roadmap differentiator |
| Make gateway depend on quantum service | Availability risk |

## Consequences

**Positive:** Honest roadmap; protects Phase 2 focus.  
**Negative:** Quantum feature remains thin until later investment.

## Compliance

- Risk: R-Q-001.  
- EAB approval required before adding quantum to prod compose critical path.  
