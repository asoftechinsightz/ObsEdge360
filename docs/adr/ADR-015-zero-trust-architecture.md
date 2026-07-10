# ADR-015: Zero Trust Architecture

**Decision Status:** Accepted  
**Date:** 2026-07-10 · **Accepted:** 2026-07-11  
**Deciders:** EAB  
**Phase / Release:** Phase 2 foundation · `v0.9.2`  
**Depends on:** ADR-009, ADR-010, ADR-011, ADR-014  

---

## Business Context

Enterprise buyers expect Zero Trust direction: never trust network location alone; continuously verify identity and authorization.

## Problem Statement

Classic “inside Docker network = trusted” is insufficient. Over-claiming full Zero Trust without controls would be dishonest.

## Decision

**Phase 2 Zero Trust foundation:**

1. Never trust network location alone — authorize every gateway request.  
2. Strong identity for users and agents.  
3. Least privilege deny-default (RBAC/ABAC).  
4. Short-lived credentials direction (ADR-008).  
5. Audit sensitive decisions (ADR-013).  
6. Keep experimental services off prod compose (ADR-003).  
7. Rate limiting + request validation as API security controls.  

**Deferred:** mesh mTLS, device posture, continuous risk scoring engines.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| VPN-only security | Not product ZT |
| Mesh mTLS in Phase 2 | Premature |
| Ignore until Phase 6 | Weak narrative |

## Consequences

**Positive:** Credible ZT foundation.  
**Negative:** Must label as foundation, not certified ZT product.

## Security Impact

Material improvement vs perimeter-only trust.

## Performance Impact

Same as AuthZ/audit budgets.

## Scalability Impact

Compatible with future mesh without rewriting business services.

## Compliance Impact

Supports zero-trust program narratives with honest scope.

## Rollback Strategy

Prior gateway without full guard chain; not recommended except emergency.

## Future Considerations

Workload identity, device trust, continuous auth.

## Decision Status

**Accepted** — EAB 2026-07-11 (foundation).  
