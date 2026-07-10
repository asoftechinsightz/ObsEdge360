# SDS-2.1 — Identity & Authorization Spine

**Document ID:** OE360-SDS-2.1  
**WBS / Wave:** Wave 1 · Identity & Authorization Spine  
**Release:** `v0.9.2`  
**Status:** APPROVED FOR IMPLEMENTATION  
**ADRs:** 008, 009, 010, 011, 013, 015  

---

## 1. Objectives

- Centralize AuthN/AuthZ at the API gateway.  
- Every protected API uses one authorization pipeline.  
- No service-local custom authorization.  
- RBAC + ABAC evaluation via `@opsedge360/shared-security`.  
- Tenant context from token (server-validated).  
- Standard security errors + audit on deny.  

## 2. Scope

**In:** JWT validation, permission catalog, AuthContext builder, AuthorizationGuard, RequirePermission, path-inferred defaults, tenant binder, refresh token endpoint, rate-limit hook, authz exception filter, deny audit.

**Out (later waves):** Full HttpOnly BFF cutover (ADR-008 deep), Vault, compliance engine, security dashboards UI.

## 3. Sequence (authorize)

```text
Client → Nginx → Gateway
  AuthGuard: Public? → allow
             Bearer JWT valid? → request.user
  TenantBinder: bind tenant from JWT; reject spoofed X-Tenant-Id
  AuthorizationGuard:
             build AuthContext (user_roles ∪ legacy role map)
             required permission = @RequirePermission OR infer(method,path)
             RBAC hasPermission? → else 403 + audit
             ABAC evaluateAbac (if policies) → else 403 + audit
  Controller / Proxy
```

## 4. APIs

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/v1/auth/login` | Public | Issues accessToken (+ optional refresh) |
| POST | `/api/v1/auth/refresh` | Bearer | Sliding refresh of access token |
| GET | `/api/v1/auth/me` | Bearer | Includes roles/permissions when loaded |
| * | protected routes | Bearer + AuthZ | Same pipeline |

## 5. Database changes

None required for Wave 1 (uses migration 015 `roles`, `user_roles`, `abac_policies`, `audit_logs`). Additive only if gaps found.

## 6. Threat model (delta)

| Threat | Mitigation |
|--------|------------|
| Missing AuthZ | Global AuthorizationGuard |
| Spoofed tenant header | Server binder rejects mismatch |
| Custom service AuthZ drift | Forbidden — gateway only |
| Token theft | Refresh shortens window later; audit denies |

## 7. Performance impact

Permission load per request: cache AuthContext in request; optional Redis later. Target +1–5 ms when roles cached in-process per request.

## 8. Rollback strategy

`AUTHZ_ENFORCE=false` → AuthN only (emergency). Redeploy prior gateway image. Keep shared-security package.

## 9. Test cases

- No token → 401  
- Valid token, missing permission → 403 + audit  
- admin `*` → allow  
- Spoofed X-Tenant-Id ≠ JWT → 403  
- Public health → 200 without token  
- Refresh with valid token → new accessToken  
- Unit: matchPermission / hasPermission / inferPermission  

## 10. Acceptance criteria

1. Single AuthZ pipeline on gateway.  
2. No duplicated AuthZ in microservices for Wave 1 scope.  
3. Protected routes evaluated centrally.  
4. OpenAPI notes updated for refresh + security scheme.  
5. Unit/integration/negative tests pass.  
6. Platform remains deployable.  
