# Release Notes — v0.9.2-wave2

**Release:** `v0.9.2-wave2`  
**Parent preview:** `v0.9.2` Enterprise Security & Compliance Foundation  
**Date:** 2026-07-11  
**Git tag:** `v0.9.2-wave2`  
**Production SHA:** `1fae9ee`  

## Summary

Wave 2 **Tenant Security** is deployed and production-validated. Tenant isolation is enforced at the API gateway: server-side UUID resolution, cross-tenant rejection, UUID downstream headers, deny auditing, permission registry, security metrics stubs, and policy version metadata (migration 016).

## Included waves

| Wave | Scope | Status |
|------|-------|--------|
| 1 | Identity & Authorization spine | Accepted + deployed (prior) |
| 2 | Tenant isolation | ✅ Deployed & validated |

## Highlights

- Global `AuthorizationGuard` + `SecurityExceptionFilter` wired  
- `resolveTenantStrict` / `request.tenantContext`  
- Cross-tenant spoof → `403 TENANT_MISMATCH`  
- `ProxyService` canonical `X-Tenant-ID: <UUID>`  
- Migration `016_authz_policy_versions`  
- Security baseline document published  

## Production validation

Script: `scripts/vps-wave2-validate.sh` → **WAVE2_VALIDATION_OK** (19/0).

## Rollback

See Security Baseline §10 and `AUTHZ_ENFORCE` / `TENANT_RESOLVE` flags.

## Not in this tag

- Wave 3 audit framework expansion  
- Wave 4 secrets/Vault  
- Wave 5 Prometheus security dashboards  
- Postgres RLS  

## References

- `docs/phase2/WAVE2_DEPLOYED.md`  
- `docs/phase2/sds/SDS-2.2-TenantIsolation.md`  
- `docs/security/SECURITY_BASELINE_v1.0.md`  
