# OpsEdge360 Security Baseline v1.0

**Document ID:** OE360-SEC-BASELINE-1.0  
**Status:** ACTIVE — reference for security reviews & compliance  
**Effective:** 2026-07-11  
**Aligned release:** `v0.9.2` (Wave 2 deployed: `v0.9.2-wave2`)  
**Authority:** EAB / Security Architecture  

This document is the living reference for platform security posture. Update it when waves land or controls change.

---

## 1. Authentication architecture

| Control | Current state |
|---------|----------------|
| Mechanism | JWT Bearer (`Authorization: Bearer`) |
| Identity store | Postgres `users` (+ SSO providers table) |
| Login / signup / password reset | Gateway `/api/v1/auth/*` |
| Session foundation | Sliding refresh via `POST /auth/refresh` |
| Cookie hardening (HttpOnly BFF) | Deferred (ADR-008) — not baseline yet |
| Production flag | `AUTH_REQUIRED=true` |

## 2. Authorization architecture

| Control | Current state |
|---------|----------------|
| Pipeline | Global `AuthGuard` → global `AuthorizationGuard` |
| Policy engine | `@opsedge360/shared-security` (`authorize`, RBAC + ABAC) |
| Permission inference | Path/method → `resource:action` |
| Permission registry | `packages/shared-security/src/permissions.ts` |
| Explicit grants | `@RequirePermission` / `@SkipAuthz` |
| Rollback | `AUTHZ_ENFORCE=false` (or `AUTH_REQUIRED=false` in non-prod) |
| Exception shape | `SecurityExceptionFilter` → `code` + `message` |

## 3. Tenant isolation

| Control | Current state |
|---------|----------------|
| JWT tenant claim | Slug (legacy-compatible) |
| Server resolution | `resolveTenantStrict` → UUID + slug on `request.tenantContext` |
| Spoof prevention | `X-Tenant-ID` must match JWT slug **or** resolved UUID |
| Downstream header | Gateway `ProxyService` sends `X-Tenant-ID: <UUID>` |
| Cache keys | Prefer UUID (`tenantCacheKey`) |
| Fail-closed | Unknown tenant → `TENANT_UNKNOWN` (unless `TENANT_RESOLVE=legacy`) |
| Postgres RLS | Not yet (future) |

## 4. Audit framework

| Control | Current state |
|---------|----------------|
| Schema | **v1.1** — [AUDIT_EVENT_SCHEMA.md](../phase2/AUDIT_EVENT_SCHEMA.md) |
| Layer 1 | `audit_logs` — sync, operational |
| Queue | `audit_evidence_outbox` — durable async path |
| Layer 2 | `audit_evidence` + `content_hash` via Evidence Writer |
| APIs | ingest, search, evidence export, verify, retention, legal hold, health |
| Emitters today | AuthZ deny (+ ingest API); expand AuthN emitters in Wave 3 harden |
| Flags | `AUDIT_EMIT`, `AUDIT_L2_QUEUE`, `AUDIT_ALLOW_SAMPLE_RATE`, `AUDIT_FAIL_CLOSED` |

## 5. Policy engine

| Control | Current state |
|---------|----------------|
| RBAC | Roles/permissions + legacy role map |
| ABAC | `abac_policies` loaded by tenant UUID |
| Policy versions | Table `authz_policy_versions` (migration 016) |
| Hard-coded roles in business logic | Forbidden — use engine + registry |

## 6. Secrets management

| Control | Current state |
|---------|----------------|
| Interface | `SecretsProvider` (`local`, `env`, stubs: vault/aws/azure/gcp/k8s) |
| Encryption | AES-256-GCM envelope; `SECRETS_MASTER_KEY` |
| Versioning / rotation / expiry | `secrets` + `secret_versions` (migration 018) |
| APIs | create, list, metadata, reveal, rotate, disable, revoke, versions, health |
| Audit | `secrets_key_management` via Wave 3 pipeline |
| Vault / cloud KMS | Stub adapters — cutover later |

## 7. Encryption standards

| Control | Current state |
|---------|----------------|
| In transit (public) | TLS via Nginx (production domains) |
| Data plane ports | Bound to `127.0.0.1` (Postgres/Redis/Kafka/gateway) |
| At rest (DB) | Host/volume encryption — ops responsibility |
| Password hashing | scrypt (`salt:hash`) |
| API keys | SHA-256 hash at rest |

## 8. Security metrics

| Metric | Status |
|--------|--------|
| `security.auth.success` | In-process counter (Wave 2) |
| `security.auth.denied` | In-process |
| `security.auth.invalid_token` / `expired_token` | In-process |
| `security.auth.cross_tenant_attempt` | In-process |
| `security.auth.refresh_success` / `refresh_failure` | In-process |
| `security.audit.write_fail` | In-process |
| Prometheus / dashboards | Wave 5 — Security Observability |

## 9. Feature flags

| Flag | Default (prod intent) | Effect |
|------|----------------------|--------|
| `AUTH_REQUIRED` | `true` | Require JWT |
| `AUTHZ_ENFORCE` | `true` | Run AuthorizationGuard |
| `TENANT_RESOLVE` | `strict` | Fail closed; `legacy` = rollback |
| `TENANT_STRICT` | unset/false | Service-side `resolveTenantId` fallback behavior |
| `SWAGGER_ENABLED` | optional | Docs exposure |

## 10. Rollback strategy

1. **AuthZ off:** set `AUTHZ_ENFORCE=false`, recreate gateway.  
2. **Tenant legacy:** set `TENANT_RESOLVE=legacy`.  
3. **Code rollback:** redeploy prior git tag/bundle; preserve `.env` and DB.  
4. **DB:** migrations 001–016 are additive; do not drop without EAB.  
5. Prefer **fix-forward** for security defects.

## 11. Trust boundaries (summary)

Internet → Nginx (TLS) → Web / API Gateway → Docker network services → Postgres/Redis/Kafka (localhost-published only).

Client-supplied tenant headers are **never** trusted without JWT match.

## 12. Change control

| Wave | Focus | Baseline impact |
|------|-------|-----------------|
| 1 | Identity & AuthZ spine | §2, §8, §9 |
| 2 | Tenant isolation | §3, §4 (deny), §5 versions |
| 3 | Audit & compliance | §4 expansion |
| 4 | Secrets & platform | §6, §7 |
| 5 | Security observability | §8 export |

**Next baseline bump:** after Wave 3 SDS acceptance + implementation → `SECURITY_BASELINE_v1.1.md` (dual-layer audit).

## 13. EAB status (2026-07-11)

| Item | Status |
|------|--------|
| Security Baseline v1.0 | ✅ Accepted |
| Wave 2 | ✅ Closed |
| SDS-2.3 | 🟡 In review — coding blocked |
