# ADR-009: Enterprise Security Architecture

**Decision Status:** Accepted  
**Date:** 2026-07-10 · **Accepted:** 2026-07-11  
**Deciders:** EAB  
**Phase / Release:** Phase 2 · `v0.9.2` Enterprise Security & Compliance Foundation  
**Depends on:** Phase 1 Approved with Operational Conditions · ADR-008  

---

## Business Context

Enterprise customers require a coherent security architecture before deeper observability, AI, and packs. OpsEdge360 must enforce identity, authorization, tenancy, audit, and secrets consistently at the platform edge.

## Problem Statement

Authentication exists (JWT), but authorization, tenant isolation, audit, secrets lifecycle, and zero-trust posture are incomplete or unenforced. Without a unified architecture, Phase 2 work would fragment across services.

## Decision

Adopt a **gateway-centric security architecture**:

1. TLS at Nginx; gateway is the public API plane.  
2. Identity: JWT/session (ADR-008); agents via `X-Agent-Key` (ADR-004).  
3. Authorization: RBAC/ABAC at gateway (ADR-010).  
4. Tenancy: token-bound isolation (ADR-011).  
5. Secrets: provider interface (ADR-014).  
6. Audit: authz/mutation trail (ADR-013).  
7. Zero Trust foundation (ADR-015).  
8. Compliance foundation (ADR-012), security dashboards (ADR-017), vuln process (ADR-018).  
9. Quantum Shield design-only / optional module (ADR-016) — never tightly coupled into core.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| Per-service authz only | Inconsistent; easy bypass |
| Defer security to Phase 6 | Unacceptable enterprise risk |
| Full mesh mTLS in Phase 2 | Premature operational load |

## Consequences

**Positive:** Single enforcement point; auditable; pack-friendly.  
**Negative:** Gateway is critical path; requires strong tests and HA discipline.

## Security Impact

Reduces OWASP A01/A07 residual risk; establishes deny-default AuthZ and auditability. Residual: MFA depth and Vault cutover deferred.

## Performance Impact

Per-request AuthZ/audit overhead; budgets in `PHASE2_PERFORMANCE_IMPACT.md`. Mitigate with permission caching.

## Scalability Impact

Gateway-centric model scales horizontally with gateway replicas; policy evaluation must remain O(1)/cached for hot paths.

## Compliance Impact

Enables evidence of access control and audit for enterprise assessments; does not by itself achieve certification.

## Rollback Strategy

Feature-flag AuthZ enforcement; redeploy prior gateway image; additive schema left in place. See `PHASE2_ROLLBACK_STRATEGY.md`.

## Future Considerations

SSO/OIDC depth, continuous risk-based auth, service mesh, Vault/KMS backend, marketplace-signed plugins.

## Decision Status

**Accepted** — EAB 2026-07-11 (Planning Pack Accepted with Recommendations).  
