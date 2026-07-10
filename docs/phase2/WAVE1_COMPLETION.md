# Wave 1 Completion — Identity & Authorization Spine

**Date:** 2026-07-11  
**Release:** `v0.9.2`  
**SDS:** `docs/phase2/sds/SDS-2.1-RBAC.md`  
**Status:** Implemented (pending deploy validation)

## Delivered

| Capability | Implementation |
|------------|----------------|
| RBAC enforcement | `AuthorizationGuard` + `hasPermission` / legacy role map |
| ABAC policy engine | `authorize()` + `evaluateAbac` when policies exist |
| Tenant context | JWT binder; spoofed `X-Tenant-Id` → 403 |
| Authorization middleware | Global `AuthGuard` → `AuthorizationGuard` |
| Permission evaluator | `@opsedge360/shared-security` `authorize` / `inferPermission` |
| JWT validation | Existing `AuthGuard` + refresh |
| Token refresh | `POST /api/v1/auth/refresh` |
| Session foundation | Sliding access token refresh (HttpOnly BFF remains ADR-008 Wave follow-up) |
| Security error handling | `SecurityExceptionFilter` |
| Deny audit | `writeAuditLog` on authz/tenant deny |

## Exit criteria

- Protected APIs share one AuthZ pipeline ✅  
- No microservice custom AuthZ added ✅  
- Centralized policy engine ✅  
- `AUTHZ_ENFORCE=false` emergency rollback ✅  

## Next

Wave 2 SDS + Tenant Security (`SDS-2.2-TenantIsolation.md`) after Wave 1 approval.
