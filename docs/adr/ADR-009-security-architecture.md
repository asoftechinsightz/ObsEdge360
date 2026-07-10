# ADR-009: Enterprise Security Architecture

**Status:** Proposed  
**Date:** 2026-07-10  
**Deciders:** EAB (Chief Architect, Security Architect, Product Owner)  
**Phase:** 2 — Enterprise Security  
**Depends on:** Phase 1 final approval · ADR-008  

---

## Context

OpsEdge360 has authentication (JWT) and partial security libraries, but lacks a unified security architecture: enforcement points, trust boundaries, session model, secrets, audit, and zero-trust posture are incomplete. Phase 2 must establish the security spine before deeper observability and AI.

## Decision

Adopt a **gateway-centric security architecture**:

1. **Edge trust:** TLS terminated at Nginx; only gateway is the public API plane.  
2. **Identity:** User JWT (evolve per ADR-008); agents via `X-Agent-Key` (ADR-004); future API keys.  
3. **Authorization:** Enforce RBAC/ABAC at gateway (ADR-010) before proxying.  
4. **Tenancy:** Mandatory tenant binding and isolation checks (ADR-011).  
5. **Secrets:** Centralized secrets approach (ADR-014); no secrets in git.  
6. **Audit:** Immutable-ish audit trail for authz and mutations (ADR-013).  
7. **Zero Trust direction:** Authenticate every request; authorize every action; least privilege (ADR-015).  
8. **Supporting frameworks:** Compliance rules (ADR-012), security dashboards (ADR-017), vuln management (ADR-018), Quantum Shield as optional advanced layer (ADR-016) — not blocking core Phase 2.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Per-service authz only | Inconsistent; easy to miss routes |
| Defer all security to Phase 6 | Unacceptable enterprise risk |
| Mesh/mTLS everywhere now | Ops complexity before compose maturity |

## Consequences

**Positive:** Clear enforcement point; auditable; aligns with frozen roadmap.  
**Negative:** Gateway becomes critical path; must stay highly available and well-tested.

## Compliance

- Production locks unchanged.  
- No Phase 2 production code until this ADR is **Accepted** and Phase 2 plan approved.  
- OWASP Top 10 addressed via Phase 2 PRR.  
