# Wave 1 — EAB Acceptance

**Date:** 2026-07-11  
**Status:** ✅ **Accepted**  
**Release:** `v0.9.2` Wave 1 — Identity & Authorization Spine  

## Delivered (accepted)

Centralized AuthZ pipeline · shared policy engine · AuthorizationGuard · tenant spoof protection · refresh · `/auth/me` · security exception filter · `AUTHZ_ENFORCE` rollback · tests · OpenAPI  

## Recommendations tracked (before / during Wave 2+)

| # | Recommendation | Tracking |
|---|----------------|----------|
| 1 | Security metrics on every AuthZ decision | ✅ Wave 2 — `metrics.ts` + guard/refresh emitters; Wave 5 dashboards |
| 2 | Common audit event schema | ✅ Wave 2 — `AUDIT_EVENT_SCHEMA.md` + `AuditEvent` |
| 3 | Permission registry (no ad-hoc strings) | ✅ Wave 2 — `permissions.ts` |
| 4 | Policy versioning metadata | ✅ Wave 2 — Migration `016` `authz_policy_versions` |

## Authorization

Proceed to **Wave 2 — Tenant Security** after SDS-2.2.
