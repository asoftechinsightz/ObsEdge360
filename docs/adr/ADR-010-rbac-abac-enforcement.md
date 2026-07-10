# ADR-010: RBAC & ABAC Enforcement

**Decision Status:** Accepted  
**Date:** 2026-07-10 · **Accepted:** 2026-07-11  
**Deciders:** EAB  
**Phase / Release:** Phase 2 · `v0.9.2`  
**Depends on:** ADR-009  

---

## Business Context

Customers expect role-based and attribute-based access control so operators only see and change what their job requires across tenants.

## Problem Statement

RBAC tables/libraries exist but are not enforced at the gateway. ABAC (tenant, environment, sensitivity) is absent. This is broken access control (OWASP A01).

## Decision

1. Enforce AuthZ at API gateway for all non-public routes.  
2. RBAC: roles → permissions (`resource:action`).  
3. ABAC: layered attributes (tenant mandatory; env/classification as designed).  
4. Deny by default.  
5. Public exceptions only via explicit allowlist.  
6. Extend `@opsedge360/shared-security`; no per-service duplicate engines.  
7. Admin bootstrap documented; no production backdoors.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| Service-only enforcement | Proxy bypass risk |
| OPA/sidecar in Phase 2 | Ops heavy; defer |
| RBAC without ABAC | Insufficient multi-tenant |

## Consequences

**Positive:** Enterprise access control; packs declare permissions.  
**Negative:** Permission catalog + test matrix growth.

## Security Impact

Directly mitigates R-SEC-002 / TD-002. Misconfigured allowlists remain a residual risk — controlled by review.

## Performance Impact

Permission lookup per request; cache in Redis/memory with TTL. Budget: +1–5 ms p50 when cached.

## Scalability Impact

Cacheable role→permission maps scale with gateway replicas; avoid N+1 DB hits per request.

## Compliance Impact

Supports least-privilege evidence; required for SOC2-style access reviews later.

## Rollback Strategy

Disable enforcement feature flag; keep catalog data; redeploy prior gateway.

## Future Considerations

Fine-grained resource-level policies, OPA optional later, break-glass with dual control.

## Decision Status

**Accepted** — EAB 2026-07-11.  
