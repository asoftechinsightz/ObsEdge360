# SDS-2.4 — Enterprise Secrets Management

**Document ID:** OE360-SDS-2.4  
**Wave:** 4 — Secrets & Platform Security  
**Release:** `v0.9.2`  
**Status:** ✅ **APPROVED FOR IMPLEMENTATION** (EAB 2026-07-11)  
**ADRs:** 014, 009  
**Depends on:** Wave 3 closed (`v0.9.2-wave3`), [SECURITY_BASELINE_v1.0](../../security/SECURITY_BASELINE_v1.0.md)  

---

## 1. Objectives

Build an **enterprise-grade secrets capability** (not only env storage): versioned encrypted secrets, provider abstraction, RBAC + tenant isolation, audit of secret lifecycle, rotation/expiry operations, and health/metrics — while preserving production locks and backward compatibility.

## 2. Scope

### In (Wave 4)

| Area | Deliverable |
|------|-------------|
| Secret storage | Encrypted at rest, versioned, rotation, expiration |
| Providers | Local encrypted store (primary) · Env bridge · stubs for Vault / AWS / Azure / GCP / K8s |
| Access control | RBAC permissions · tenant isolation · least privilege |
| Audit | create / access / rotate / delete / policy via Wave 3 pipeline |
| Security | Envelope encryption (AES-256-GCM) · masking in logs/API · master key from env/KMS-ready |
| APIs | create, read, rotate, disable, revoke, version history |
| Operations | health · rotation scheduler · expiry monitoring · metrics |

### Out / later

- Full HashiCorp Vault / cloud KMS production cutover (adapters stubbed)  
- Automatic KMS CMK rotation  
- Dynamic DB credentials  
- mTLS service identity (direction only)  

## 3. Architecture

```text
Client / Services
      │  RBAC + tenant binder (Wave 1–2)
      ▼
Secrets API (gateway)
      │
      ▼
SecretsProvider (interface)
      ├── LocalEncryptedProvider  ← Wave 4 default
      ├── EnvProvider             ← bootstrap / legacy bridge
      ├── VaultProvider           ← stub
      ├── AwsSecretsProvider      ← stub
      ├── AzureKeyVaultProvider   ← stub
      ├── GcpSecretManagerProvider← stub
      └── K8sSecretsProvider      ← stub
      │
      ├── Postgres metadata + ciphertext versions
      └── Audit emit (secrets_key_management) → Wave 3 pipeline
```

**Envelope encryption:** `SECRETS_MASTER_KEY` (32-byte base64) encrypts DEKs or directly encrypts payloads with AES-256-GCM; field reserved for future KMS wrap.

## 4. Data model

### `secrets`

| Column | Notes |
|--------|-------|
| id | UUID |
| tenant_id | UUID — isolation |
| name | Unique per tenant |
| description | |
| provider | `local` \| `env` \| … |
| status | `active` \| `disabled` \| `revoked` |
| current_version | int |
| expires_at | nullable |
| rotate_after | interval days nullable |
| metadata | JSONB |
| created_at / updated_at | |

### `secret_versions`

| Column | Notes |
|--------|-------|
| id | UUID |
| secret_id | FK |
| version | int |
| ciphertext | bytea / text |
| nonce | text |
| key_id | master key version label |
| created_by | actor |
| created_at | |
| disabled_at | nullable |

## 5. APIs

| Method | Path | Permission | Purpose |
|--------|------|------------|---------|
| POST | `/api/v1/secrets` | `secrets:write` | Create |
| GET | `/api/v1/secrets` | `secrets:read` | List (no plaintext) |
| GET | `/api/v1/secrets/:id` | `secrets:read` | Metadata |
| GET | `/api/v1/secrets/:id/value` | `secrets:read` | Reveal (audited) |
| POST | `/api/v1/secrets/:id/rotate` | `secrets:rotate` | Rotate |
| POST | `/api/v1/secrets/:id/disable` | `secrets:write` | Disable |
| POST | `/api/v1/secrets/:id/revoke` | `secrets:write` | Revoke |
| GET | `/api/v1/secrets/:id/versions` | `secrets:read` | Version history |
| GET | `/api/v1/secrets/health` | `secrets:read` | Provider health |

Reveal responses never logged; API may return once; audit records **access** without value.

## 6. Access control

- Tenant UUID from Wave 2 binder — no cross-tenant secret read  
- Permissions: `secrets:read`, `secrets:write`, `secrets:rotate` in registry  
- Service identities: future; Wave 4 uses user JWT + admin role  

## 7. Audit events

Category `secrets_key_management`: `secret.created`, `secret.accessed`, `secret.rotated`, `secret.disabled`, `secret.revoked`, `secret.policy_updated`.

## 8. Operations

| Capability | Wave 4 |
|------------|--------|
| Health | Provider configured + master key present + DB reachable |
| Rotation scheduler | Interval job: secrets past `rotate_after` / near `expires_at` → metric + optional auto-rotate flag |
| Expiry monitoring | Metric `security.secrets.expiring` |
| Failure alerts | Metric `security.secrets.rotate_fail` (Wave 5 dashboards) |

## 9. Security controls

| Control | Requirement |
|---------|-------------|
| Encryption at rest | AES-256-GCM |
| Versioning | Immutable version rows |
| Masking | Logs/API list never show plaintext |
| Master key | `SECRETS_MASTER_KEY` required when local provider enabled in prod |
| Rollback | `SECRETS_PROVIDER=env` disables local store writes |

## 10. Acceptance criteria

1. Create/read/rotate/disable/revoke/version APIs work with tenant isolation  
2. Ciphertext only in DB — no plaintext columns  
3. Reveal audited; value not in audit payload  
4. Cross-tenant secret access → 403  
5. Provider stubs present and selectable  
6. Health endpoint reports provider status  
7. Migration additive (018)  
8. OpenAPI + tests  
9. Security Baseline §6 updated  

## 11. Governance

Implement → test → deploy/validate → Wave 4 review → Wave 5.
