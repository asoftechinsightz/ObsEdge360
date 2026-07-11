# SDS-2.5 — Enterprise Identity & Trust Services

**Document ID:** OE360-SDS-2.5  
**Wave:** 5 — Enterprise Identity & Trust (Zero Trust foundation)  
**Release:** `v0.9.2`  
**Status:** ✅ **APPROVED FOR IMPLEMENTATION** (EAB 2026-07-11)  
**ADRs:** 015 (Zero Trust), 008 (session), 009, 010 · SSO foundation (existing)  
**Depends on:** Wave 4 closed (`v0.9.2-wave4`)  

---

## 1. Objectives

Strengthen Zero Trust by introducing **service-to-service identity**, short-lived credentials, certificate lifecycle metadata, workload identity records, and policy enforcement at the gateway→service boundary — while preserving backward compatibility and existing user JWT / SSO paths.

## 2. Scope realignment

| Prior plan | EAB decision |
|------------|--------------|
| Wave 5 = Security Observability | **Deferred to Wave 6** |
| Wave 5 = Identity & Trust | **This SDS** |

### In (Wave 5)

| Capability | Deliverable |
|------------|-------------|
| Service-to-service identity | `service_identities` registry (per tenant / platform) |
| Short-lived service credentials | Signed service JWT (TTL minutes); hash-at-rest of refresh/api material |
| Gateway→service auth | Proxy injects `X-Service-Authorization: Bearer <svc-jwt>` |
| Downstream verification | Shared middleware; enabled on CMDB first (pattern for others) |
| Certificate lifecycle | Metadata registry (issue/register/expire/revoke) — not full CA |
| Workload identity | Service identity `kind=workload` |
| Fine-grained policies | Service JWT `scopes[]` checked by middleware |
| Enterprise SSO | Existing OIDC/SAML retained; health + audit hooks |
| Audit | identity/trust events via Wave 3 pipeline |
| mTLS | **Design + optional TLS verify flags**; full mesh deferred |

### Out

- Full service mesh / automatic mTLS everywhere  
- External PKI/CA product  
- Replacing user JWT  
- Security observability dashboards (Wave 6)  

## 3. Architecture

```text
User JWT (Wave 1) ──► Gateway AuthZ (Wave 1–2)
                           │
                           ▼
                    Mint/attach Service JWT
                           │
                           ▼
              ┌────────────┴────────────┐
              ▼                         ▼
         CMDB (+ verify)          Other services
         X-Service-Authorization   (opt-in verify)
              │
              ▼
         Scopes + tenant UUID
```

**Phased trust:**
1. **Wave 5a (this wave):** Service JWT identity + verification middleware  
2. **Later:** mTLS between Nginx↔services / service↔service with cert registry  

## 4. Data model (migration 019)

### `service_identities`
id, tenant_id (nullable for platform), name, kind (`service`\|`workload`), status, scopes[], metadata, created_at  

### `service_credentials`
id, identity_id, credential_type (`jwt_key`\|`api_key`), key_hash, kid, expires_at, revoked_at  

### `trust_certificates`
id, tenant_id, identity_id, subject_cn, fingerprint_sha256, not_before, not_after, status (`active`\|`expired`\|`revoked`), pem_public (optional), metadata  

## 5. APIs

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/trust/identities` | Register service/workload identity |
| GET | `/api/v1/trust/identities` | List |
| POST | `/api/v1/trust/identities/:id/token` | Mint short-lived service JWT |
| POST | `/api/v1/trust/identities/:id/revoke` | Revoke identity/credentials |
| GET | `/api/v1/trust/certificates` | List cert metadata |
| POST | `/api/v1/trust/certificates` | Register certificate |
| POST | `/api/v1/trust/certificates/:id/revoke` | Revoke cert |
| GET | `/api/v1/trust/health` | Trust subsystem health |
| GET | `/api/v1/auth/sso/health` | SSO providers readiness |

Permissions: `trust:read`, `trust:write`, `trust:mint` (admin/`*`).

## 6. Service JWT claims

```json
{
  "sub": "<identity-uuid>",
  "tid": "<tenant-uuid|platform>",
  "kind": "service",
  "scopes": ["cmdb:proxy", "discovery:proxy"],
  "iss": "opsedge360-trust",
  "aud": "opsedge360-services",
  "exp": "...",
  "iat": "...",
  "jti": "..."
}
```

Signed with `SERVICE_JWT_SECRET` or derived from `JWT_SECRET` (documented). TTL default **5–15 minutes**.

## 7. Enforcement

| Flag | Effect |
|------|--------|
| `SERVICE_AUTH_ENABLED=true` | Gateway mints/attaches service JWT on proxy |
| `SERVICE_AUTH_REQUIRED=true` | Downstream rejects missing/invalid service JWT |
| Default Wave 5 deploy | Gateway attach **on**; CMDB verify **on**; others off until rolled |

## 8. Acceptance criteria

1. Register identity + mint token + verify on CMDB  
2. Invalid/missing service JWT → 401 when required  
3. Cross-tenant identity isolation  
4. Cert register/revoke metadata APIs  
5. Audit on mint/revoke  
6. SSO health endpoint  
7. Migration 019 · OpenAPI · tests · VPS validation  
8. No break to user JWT AuthZ / Wave 2–4 controls  

## 9. Rollback

`SERVICE_AUTH_ENABLED=false` / `SERVICE_AUTH_REQUIRED=false`; redeploy prior tag.
