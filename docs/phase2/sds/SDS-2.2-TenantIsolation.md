# SDS-2.2 — Tenant Isolation

**Document ID:** OE360-SDS-2.2  
**Wave:** 2 — Tenant Security  
**Release:** `v0.9.2`  
**Status:** DEPLOYED — `v0.9.2-wave2`  
**ADRs:** 009, 010, 011, 013  

---

## 1. Objectives

Make tenant isolation **systematic** across the platform: server-side resolution, cross-tenant prevention, tenant-aware data/cache/events/audit/APIs, and automated isolation tests.

## 2. Scope

**In:** Strict slug/UUID resolution · gateway resolves UUID before proxy · spoof detection (slug or UUID) · audit with UUID FK · ABAC by tenant UUID · permission registry · security metrics · audit event schema · policy version metadata · cache key guidance · shared-db strict resolver  

**Out:** Full RLS in Postgres (later) · service-mesh identity · per-tenant DB  

## 3. Data flow

```text
JWT (tenant slug)
  → AuthGuard
  → AuthorizationGuard
       → resolveTenantStrict(slug) → { id: UUID, slug }
       → bind request.tenantContext
       → reject header spoof (slug or UUID ≠ token tenant)
       → AuthZ + ABAC(policies by UUID)
       → audit(deny) with tenant UUID
  → Controllers pass tenant slug/id
  → ProxyService resolves to UUID → X-Tenant-ID: <UUID>
  → Services resolveTenantId(UUID) → same UUID → SQL WHERE tenant_id = $1
```

## 4. Trust boundaries

| Boundary | Trust |
|----------|-------|
| Internet → Nginx | TLS only |
| Client → Gateway | JWT; never trust client tenant alone |
| Gateway → Services | Docker network; `X-Tenant-ID` must be gateway-injected UUID |
| Service → DB | Queries must filter `tenant_id` |

## 5. Threat model

| ID | Threat | Mitigation |
|----|--------|------------|
| T1 | Spoofed X-Tenant-Id | Guard compares to JWT tenant (slug/UUID) |
| T2 | Unknown slug → silent default | `resolveTenantStrict` fails closed |
| T3 | Audit FK fail (slug in UUID column) | Resolve UUID before write |
| T4 | Cache bleed across tenants | `tenantCacheKey(uuid, …)` |
| T5 | Direct service port access | Localhost binds (Phase 1); Wave 4 service identity |

## 6. Attack scenarios

1. Attacker with Tenant A token sends `X-Tenant-Id: tenant-b` → **403 TENANT_MISMATCH**  
2. Attacker uses invalid slug → **400/403 TENANT_UNKNOWN** (no default fallback)  
3. Attacker hits service with forged header (if exposed) → blocked by localhost bind  

## 7. Cross-tenant test matrix

| Case | Expected |
|------|----------|
| Token A, header A (slug) | Allow |
| Token A, header A (UUID) | Allow |
| Token A, header B | 403 |
| Token A, no header | Allow (use token tenant) |
| Invalid slug in token | 401/403 |
| Proxy forwards UUID | Service sees UUID |

## 8. Failure modes & recovery

| Failure | Behavior | Recovery |
|---------|----------|----------|
| DB down during resolve | 503 | Retry / degrade with AUTH_REQUIRED=false only in dev |
| Audit write fails | Request still denied/allowed; metric `audit_write_fail` | Fix DB; no silent tenant fallback |
| Mis-resolved tenant | Fail closed | Fix seed/migrations |

## 9. APIs / headers

- Downstream: `X-Tenant-ID: <uuid>` (canonical)  
- Optional response meta: `X-Tenant-Slug` on gateway responses (non-sensitive)  

## 10. Database

- Migration **016**: `authz_policy_versions` (+ optional link from abac)  
- No change to `tenants` PK model  

## 11. Performance

One tenant lookup per request (cache in `request.tenantContext`; optional Redis TTL later).

## 12. Rollback

`TENANT_STRICT=false` restores legacy `resolveTenantId` fallback-to-default for services; gateway can set `TENANT_RESOLVE=legacy`. Prefer fix-forward.

## 13. Acceptance criteria

1. Gateway never proxies a client-controlled tenant without JWT match.  
2. Downstream `X-Tenant-ID` is UUID.  
3. Audit denies persist with valid `tenant_id` UUID.  
4. ABAC loads by tenant UUID.  
5. Isolation test matrix green.  
6. Permission registry + audit schema + metrics stubs published.  
