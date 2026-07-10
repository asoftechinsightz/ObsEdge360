# ADR-010: RBAC & ABAC Enforcement

**Status:** Proposed  
**Date:** 2026-07-10  
**Deciders:** Security Architect, Chief Architect  
**Phase:** 2  
**Depends on:** ADR-009  

---

## Context

RBAC tables/library exist from Sprint 0 / migration 015, but gateway does not consistently enforce permissions. ABAC (attributes such as tenant, environment, sensitivity) is not applied. This is broken access control risk (OWASP A01).

## Decision

1. **Enforce at API gateway** for all non-public routes.  
2. **RBAC:** role → permissions on resources/actions (e.g. `cmdb:read`, `security:write`).  
3. **ABAC:** attribute checks layered on RBAC (tenant match, optional env/classification).  
4. **Deny by default** when permission missing.  
5. **Public exceptions** only via explicit allowlist (auth pages, agent-key routes per ADR-004).  
6. **Admin bootstrap** documented; no hardcoded backdoors in production.  
7. Reuse/extend `@opsedge360/shared-security` rather than duplicating policy engines per service.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Service-only enforcement | Bypass via misconfigured proxy |
| OPA/Sidecar in Phase 2 | Heavy ops; defer to later if needed |
| RBAC without ABAC | Insufficient for multi-tenant |

## Consequences

**Positive:** Enterprise-grade access control; pack features can declare permissions.  
**Negative:** Requires careful permission catalog; migration of existing users/roles; test matrix grows.

## Compliance

- OpenAPI security schemes updated.  
- Negative tests required (DoD).  
- Linked debt: TD-002 · risk: R-SEC-002.  
