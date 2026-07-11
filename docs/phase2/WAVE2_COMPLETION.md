# Wave 2 Completion — Tenant Security

**Wave:** 2  
**Release:** `v0.9.2`  
**SDS:** [SDS-2.2-TenantIsolation.md](./sds/SDS-2.2-TenantIsolation.md)  
**Status:** ✅ COMPLETE — **DEPLOYED & VALIDATED** (`v0.9.2-wave2`)  

## Delivered

| Item | Location |
|------|----------|
| Strict tenant resolver | `packages/shared-db` — `resolveTenantStrict`, `getTenantById`; `TENANT_STRICT` on legacy resolver |
| Gateway tenant binding | `AuthorizationGuard` → `request.tenantContext` `{ id, slug, name }` |
| Spoof check (slug or UUID) | Header must match JWT tenant slug **or** resolved UUID |
| Proxy UUID injection | `ProxyService` resolves slug→UUID before `X-Tenant-ID` |
| ABAC by tenant UUID | Policies loaded with resolved UUID |
| Audit with UUID FK | Deny audits use `tenantContext.id` |
| Permission registry | `packages/shared-security/src/permissions.ts` |
| Security metrics | `security.auth.*` counters in `metrics.ts` |
| Audit event schema | `audit-event.ts` + [AUDIT_EVENT_SCHEMA.md](./AUDIT_EVENT_SCHEMA.md) |
| Policy versioning | Migration **016** `authz_policy_versions` |
| Tenant-aware cache | Executive KPIs cache key uses UUID when context present |
| Isolation tests | Gateway matrix + shared-security/shared-db contracts |
| OpenAPI | `X-Tenant-ID` parameter documented |

## Rollback

| Flag | Effect |
|------|--------|
| `TENANT_RESOLVE=legacy` | Guard/proxy skip fail-closed UUID binding |
| `TENANT_STRICT=false` (default) | Service-side `resolveTenantId` may still fall back to `default` |
| `AUTHZ_ENFORCE=false` | Skips AuthZ + tenant binder (Wave 1) |

## Acceptance checklist (SDS-2.2)

1. Gateway never proxies client-controlled tenant without JWT match — **yes**  
2. Downstream `X-Tenant-ID` is UUID — **yes** (via ProxyService)  
3. Audit denies use tenant UUID — **yes**  
4. ABAC loads by tenant UUID — **yes**  
5. Isolation test matrix green — **unit matrix covered**  
6. Registry + audit schema + metrics published — **yes**  

## Out of scope (later waves)

- Postgres RLS  
- Tenant-aware Kafka event envelopes (Wave 3+ hardening)  
- Background job tenant binders across all workers  
- Prometheus scrape of `security.auth.*` (Wave 5)  

## Next

EAB Wave 2 review → approve → Wave 3 SDS-2.3 Audit & Compliance Foundation.
