# SDS-2.7 — Enterprise Service Identity Mesh (mTLS / SPIFFE)

**Document ID:** OE360-SDS-2.7  
**Wave:** 7 — Enterprise Service Identity Mesh  
**Release:** `v0.9.2`  
**Status:** ✅ **APPROVED FOR IMPLEMENTATION** (EAB 2026-07-11)  
**ADRs:** 015 (Zero Trust) · Depends on Waves 5–6 closed (`v0.9.2-wave5`, `v0.9.2-wave6`)

---

## 1. Objectives

Complete the Zero Trust **communication layer** by assigning SPIFFE identities to workloads, issuing/rotating X.509 SVIDs from a platform trust domain, enabling **mutual TLS** on the gateway→CMDB path, and integrating certificate lifecycle with audit + security observability — without breaking Wave 5 JWT service auth.

## 2. Scope

### In (Wave 7)

| Capability | Deliverable |
|------------|-------------|
| SPIFFE ID issuance | `spiffe://<trust-domain>/…` on `service_identities` |
| Platform CA (SPIFFE-compatible) | Internal X.509 CA + versioned trust bundle |
| Workload SVIDs | Issue / rotate / revoke; encrypted private key at rest |
| mTLS gateway→CMDB | HTTPS + client cert; SPIFFE URI SAN verification |
| Dual auth | mTLS **or** Wave 5 service JWT (safe rollout / rollback) |
| Trust ops | Expiry monitoring, mesh health, identity inventory, trust relationships |
| Audit + SecObs | Cert issue/rotate/revoke → audit + `security_events` |
| Migration | **021** |

### Out / later

| Item | Notes |
|------|-------|
| Full SPIRE server/agent cluster | Federation-ready design; external SPIRE optional follow-on |
| Mesh for every microservice | CMDB first (same pattern as Wave 5 JWT) |
| Replacing user JWT / SSO | Unchanged |
| Service mesh product (Istio/Linkerd) | Not required |

## 3. Architecture

```text
┌──────────────── Trust Control Plane (Gateway) ────────────────┐
│  Platform CA  →  Trust Bundle  →  SVID issue/rotate/revoke     │
│  SPIFFE IDs on service_identities                              │
└───────────────────────────┬────────────────────────────────────┘
                            │
          ┌─────────────────┴─────────────────┐
          ▼                                   ▼
   Gateway client SVID                 CMDB server SVID
   https.Agent (mTLS)                  HTTPS :4443 requestCert
          │                                   │
          └──────── mTLS session ─────────────┘
                    (JWT fallback if mTLS off)
```

**Trust domain (default):** `opsedge360.local` (`SPIFFE_TRUST_DOMAIN`)

**Phased enforcement:**
1. `MTLS_ENABLED=true` — dual auth (mTLS preferred, JWT accepted)
2. `MTLS_REQUIRED=true` — mTLS mandatory on CMDB HTTPS listener (JWT still on HTTP :4002 for health/rollback)

## 4. Data model (migration 021)

### `service_identities` (alter)
- `spiffe_id` TEXT UNIQUE NULL

### `trust_ca`
id, trust_domain, subject_cn, fingerprint_sha256, pem_cert, status, created_at  
(CA private key: env/file or encrypted column `enc_key` + nonce)

### `trust_bundles`
id, version, pem_bundle, created_at

### `workload_svids`
id, identity_id, spiffe_id, serial, fingerprint_sha256, pem_cert, enc_private_key, enc_nonce,  
not_before, not_after, status (`active`\|`rotated`\|`revoked`), rotated_from, created_at

## 5. APIs

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/trust/mesh/bootstrap` | Ensure platform CA + initial bundle |
| GET | `/api/v1/trust/mesh/bundle` | Current trust bundle (PEM) |
| GET | `/api/v1/trust/mesh/health` | CA, SVID counts, expiry, mTLS flags |
| GET | `/api/v1/trust/mesh/inventory` | Identities + SVIDs |
| GET | `/api/v1/trust/mesh/relationships` | Trust edges (gateway→services) |
| POST | `/api/v1/trust/mesh/identities/:id/svid` | Issue SVID |
| POST | `/api/v1/trust/mesh/svids/:id/rotate` | Rotate (new active, old rotated) |
| POST | `/api/v1/trust/mesh/svids/:id/revoke` | Revoke |
| POST | `/api/v1/trust/mesh/materialize` | Write gateway/cmdb PEMs to SVID volume |

Permissions: existing `trust:read` / `trust:write` / `trust:mint`.

## 6. SPIFFE ID convention

```text
spiffe://{trust_domain}/ns/{tenant|platform}/sa/{identity_name}
```

## 7. Acceptance criteria

1. Platform CA bootstrapped; trust bundle retrievable  
2. SPIFFE IDs assigned; SVID issue/rotate/revoke works without downtime on JWT path  
3. Gateway→CMDB mTLS succeeds when enabled (`WAVE7` validate)  
4. Missing/invalid peer identity rejected  
5. Tenant isolation preserved on trust/mesh APIs  
6. Cert lifecycle events in audit + security observability  
7. Feature flags allow full rollback to JWT-only  

## 8. Rollback

| Flag | Effect |
|------|--------|
| `MTLS_ENABLED=false` | No client mTLS; JWT-only (Wave 5) |
| `MTLS_REQUIRED=false` | CMDB HTTPS accepts JWT if no client cert |
| `MESH_AUTO_BOOTSTRAP=false` | Skip auto CA/SVID materialize on gateway start |
