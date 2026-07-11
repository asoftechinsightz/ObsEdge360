# Wave 2 — Deployed (Production)

**Document ID:** OE360-WAVE2-DEPLOY-001  
**Status:** ✅ **DEPLOYED & VALIDATED**  
**Tag:** `v0.9.2-wave2`  
**Production commit:** `1fae9ee`  
**Validated:** 2026-07-11  
**Environment:** VPS `observability360.asoftechinsightz.com` / `api.observability360.asoftechinsightz.com`  

## Decision

| Item | Status |
|------|--------|
| Wave 2 implementation | ✅ Accepted (EAB) |
| Wave 2 architecture | ✅ Approved (EAB) |
| VPS deploy | ✅ Confirmed |
| Production validation | ✅ `WAVE2_VALIDATION_OK` (19 pass / 0 fail) |

## Validation evidence

| Check | Result |
|-------|--------|
| `/health` `/ready` `/live` `/metrics` | 200 |
| Login / signup | 201 |
| `/auth/me` | 200 |
| Refresh token | 201 + new accessToken |
| RBAC (`/cmdb/stats`) | 200 with Bearer |
| Cross-tenant spoof | **403** `TENANT_MISMATCH` |
| Matching tenant header | 200 |
| Topology (post ci_type fix) | 200 |
| Migration 016 | `authz_policy_versions` present |
| Audit `authz.deny` | ≥1 in last hour |
| `AUTHZ_ENFORCE` in gateway | `true` |
| Web | 200 |

## Hotfix included in deploy

Wave 2 initial deploy (`ea614fb` / `7569c20`) failed AuthZ validation because `AuthorizationGuard` was not registered as `APP_GUARD`. Fixed in `1fae9ee` together with:

- `SecurityExceptionFilter` registration  
- `AUTHZ_ENFORCE` / `TENANT_RESOLVE` injected into gateway compose  
- Migration runner hook for **016**  
- Topology `ci_type::text` cast  
- Migrate profile includes `core`  

## Next

Wave 3 — Audit & Compliance Foundation — **authorized to start** after this deploy confirmation.  
Security baseline: `docs/security/SECURITY_BASELINE_v1.0.md`
