# SDS-2.3 — Audit & Compliance Foundation

**Document ID:** OE360-SDS-2.3  
**Wave:** 3 — Audit & Compliance Foundation  
**Release:** `v0.9.2`  
**Status:** 🟡 **IN REVIEW** — EAB architecture review required before coding  
**ADRs:** 012, 013 (+ baseline Wave 1–2)  
**Depends on:** Wave 2 closed (`v0.9.2-wave2`), [SECURITY_BASELINE_v1.0](../../security/SECURITY_BASELINE_v1.0.md), [AUDIT_EVENT_SCHEMA](../AUDIT_EVENT_SCHEMA.md)  
**Coding:** ⏸️ **BLOCKED** until this SDS is Accepted  

---

## 1. Objectives

Make audit and compliance **systematic and dual-layered**:

1. Every security- and compliance-relevant action emits a schema-conformant audit event.  
2. Operational audit supports fast search/UI (short retention).  
3. Compliance evidence store supports long retention, investigation, and regulatory export.  
4. APIs expose search, export, and evidence without breaking tenant isolation.

## 2. Scope

### In (Wave 3)

| Area | Deliverable |
|------|-------------|
| Event model | Expanded standard schema (this SDS + schema doc) |
| Emitters | AuthN, AuthZ deny (existing), AuthZ allow (configurable), admin/config/policy, compliance actions |
| Dual storage | Layer 1 operational + Layer 2 compliance evidence path (design + initial write path) |
| Retention | Policy metadata + purge/archive job design |
| Tamper posture | Append-only app writes; hash field; signatures/chain = future |
| APIs | Search, export, compliance export, evidence API (tenant-scoped) |
| OpenAPI | All new endpoints |
| Tests | Emitter coverage, tenant isolation, negative access, perf smoke |
| Docs | Baseline §4 update; Wave 3 completion |

### Out (later)

- Full GRC UI productization  
- SIEM connectors (Wave 5)  
- WORM / object-lock cloud archive  
- Legal hold workflows  
- Digital signatures & immutable hash chain (design reserved; not required to ship Wave 3)  
- Cross-tenant break-glass auditor role (design only)

## 3. Architectural principle — two audit layers

As the platform grows, **do not** force one store to serve both dashboards and regulatory evidence.

```text
                    ┌─────────────────────────────┐
   Emitters ───────►│  Audit Ingest (shared API)  │
                    └─────────────┬───────────────┘
                                  │
              ┌───────────────────┴───────────────────┐
              ▼                                       ▼
   ┌─────────────────────┐               ┌─────────────────────────┐
   │ Layer 1             │               │ Layer 2                 │
   │ Operational Audit   │               │ Compliance Evidence     │
   │ Fast · searchable   │               │ Immutable intent        │
   │ 30–90 days          │               │ Long retention          │
   │ UI / ops dashboards │               │ Investigations / regs   │
   └─────────────────────┘               └─────────────────────────┘
```

| | Layer 1 — Operational Audit | Layer 2 — Compliance Evidence Store |
|--|------------------------------|--------------------------------------|
| Purpose | Ops, security triage, product UI | Regulatory evidence, investigations |
| Latency | Low (sync or near-sync write) | May be async (queue → archive writer) |
| Retention | **30–90 days** (configurable per tenant) | **1–7+ years** (policy-driven) |
| Mutability | Append-only; purge after retention | Append-only; no purge without EAB |
| Storage (Wave 3) | Postgres `audit_logs` (existing) | Postgres `audit_evidence` (+ optional object storage later) |
| Query | Full-text / filters for UI | Evidence ID, control ID, date range, export packs |
| Competition | Must not slow Layer 2 archives | Must not block Layer 1 UI queries |

**Wave 3 minimum:** Layer 1 hardened + Layer 2 table/API skeleton with dual-write for **high-value categories** (Authentication, Authorization deny, Administration, Compliance, Policy). Full async archive pipeline may be staged if EAB accepts phased delivery.

---

## 4. Audit event model

### 4.1 Standard schema (logical)

All emitters MUST populate the following logical fields (storage mapping in §4.2).

| Field | Required | Description |
|-------|----------|-------------|
| **eventId** | Yes | UUID; stable unique id |
| **timestamp** | Yes | Server UTC ISO-8601 |
| **tenantId** | Yes | Tenant **UUID** |
| **organization** | No* | Org/tenant display name or slug (*required when known) |
| **userId** | Cond. | Actor user UUID |
| **role** | No | Primary role at decision time |
| **permission** | No | Permission evaluated (e.g. `cmdb:read`) |
| **resource** | Cond. | Resource type (+ optional resourceId) |
| **action** | Yes | Canonical action string |
| **decision** | Cond. | `allow` \| `deny` \| `n/a` |
| **reason** | No | Human/machine reason code |
| **riskScore** | No | 0–100 |
| **sourceIp** | No | Client IP |
| **userAgent** | No | UA string |
| **correlationId** | No | Request correlation |
| **traceId** | No | Distributed trace |
| **sessionId** | No | Session / refresh family id |
| **service** | Yes | Emitting service (`api-gateway`, …) |
| **environment** | Yes | `production` \| `staging` \| `development` |
| **category** | Yes | See §5 |
| **policy** | No | Policy id/version |
| **controlIds** | No | Compliance control refs (e.g. `CC6.1`) |
| **metadata** | No | Extra JSON (no secrets) |

This **extends** [AUDIT_EVENT_SCHEMA.md](../AUDIT_EVENT_SCHEMA.md); Wave 3 updates that doc to FROZEN v1.1 after SDS acceptance.

### 4.2 Storage mapping (Layer 1)

| Logical | Column / location |
|---------|-------------------|
| eventId | `id` (UUID PK; add if missing via migration 017) |
| timestamp | `created_at` |
| tenantId | `tenant_id` |
| userId | `actor_id` |
| action | `action` |
| resource | `resource_type`, `resource_id` |
| correlationId | `correlation_id` |
| sourceIp | `ip_address` |
| organization, role, permission, decision, reason, riskScore, userAgent, traceId, sessionId, service, environment, category, policy, controlIds | `metadata` JSONB |

### 4.3 Layer 2 evidence row (proposed)

`audit_evidence`: `id`, `tenant_id`, `event_id` (FK/logical), `category`, `payload` JSONB (full event snapshot), `content_hash`, `retained_until`, `created_at`, `control_ids[]`.

---

## 5. Event categories

| Category | Examples |
|----------|----------|
| **Authentication** | login success/fail, logout, refresh, password reset, SSO |
| **Authorization** | allow/deny, tenant spoof, permission check |
| **Configuration** | connector/config changes, feature flags |
| **Policy** | RBAC/ABAC policy create/update/deprecate |
| **Compliance** | control evaluation, evidence attach, score change |
| **Security** | API key issue/revoke, threat detections |
| **Workflow** | workflow start/complete/fail (future-ready) |
| **Integration** | webhook/outbound integration calls |
| **AI** | agent/AI execute (future-ready; emit when used) |
| **System** | migrate, deploy marker, health degrade (selective) |
| **Administration** | user/role/tenant admin mutations |

Wave 3 **mandatory emitters:** Authentication, Authorization (deny always; allow optional/sampled), Administration, Policy, Compliance (when APIs touched), Security (API keys if present).

---

## 6. Storage strategy

| Store | Role | Wave 3 |
|-------|------|--------|
| **Operational Audit** | Layer 1 hot path | Extend `audit_logs`; indexes; retention job |
| **Compliance Audit / Evidence** | Layer 2 | New `audit_evidence` (+ dual-write) |
| **Long-Term Archive** | Cold | Design: export packs to object storage; implement stub or deferred with EAB note |

### 6.1 Retention policy

| Class | Default | Configurable |
|-------|---------|--------------|
| Operational (L1) | 90 days | 30–90 per tenant |
| Compliance evidence (L2) | 2555 days (~7y) | Policy table |
| AuthZ deny | Mirror to L2 always | — |
| AuthZ allow | L1 only (or sample) | Flag `AUDIT_ALLOW_SAMPLE_RATE` |

### 6.2 Tamper protection (Wave 3 vs future)

| Control | Wave 3 | Future |
|---------|--------|--------|
| Append-only application API | ✅ | |
| No UPDATE/DELETE endpoints | ✅ | |
| `content_hash` (SHA-256 of canonical payload) | ✅ on L2 | |
| DB role revoke DELETE | Recommended | |
| Digital signatures | | ✅ |
| Hash-chained immutable log | | ✅ |
| WORM object lock | | ✅ |

---

## 7. Performance

| Topic | Target / approach |
|-------|-------------------|
| **Expected events/sec** | Baseline: &lt; 50/s typical; design for **500/s** burst without blocking requests (async buffer if needed) |
| **Write path** | Sync L1 best-effort; never fail closed on L1 write except when `AUDIT_FAIL_CLOSED=true` (default false) |
| **Retention** | Nightly purge L1 beyond policy; L2 exempt |
| **Compression** | JSONB as-is Wave 3; archive packs gzip later |
| **Indexing** | `(tenant_id, created_at DESC)`, `(tenant_id, action)`, `(tenant_id, (metadata->>'category'))` |
| **Partitioning** | Design note: monthly partition by `created_at` if volume warrants; optional migration |
| **Archive strategy** | Scheduled export of L2 packs (JSONL.gz) — stub job OK if EAB accepts |

Perf budget: audit write p99 &lt; **20ms** added to request when sync; prefer fire-and-forget queue for L2.

---

## 8. APIs

All under `/api/v1`, AuthZ via centralized engine, tenant from `tenantContext`.

| API | Method | Permission | Purpose |
|-----|--------|------------|---------|
| **Audit Search** | `GET /audit/events` | `security:read` or `audit:read` | Filter by time, category, action, actor, decision |
| **Audit Export** | `GET /audit/events/export` | `security:read` + export grant | CSV/JSONL operational export (L1) |
| **Compliance Export** | `GET /audit/compliance/export` | `compliance:read` or `audit:export` | Evidence pack (L2) by date/control |
| **Evidence API** | `GET /audit/evidence/:id` | `compliance:read` | Single evidence record + hash |

OpenAPI required. Pagination mandatory. Max page size enforced.

---

## 9. Security

| Control | Requirement |
|---------|-------------|
| **Encryption in transit** | TLS (existing Nginx) |
| **Encryption at rest** | Host/volume; no plaintext secrets in payload |
| **Hash verification** | L2 `content_hash`; verify on evidence GET |
| **Digital signatures** | Future — reserved field `signature` nullable |
| **Immutable audit chain** | Future — `prev_hash` nullable |
| **Tenant isolation** | All reads filtered by resolved tenant UUID |
| **PII** | Redact passwords, tokens, Authorization headers |
| **Feature flags** | `AUDIT_EMIT`, `AUDIT_L2_DUAL_WRITE`, `AUDIT_ALLOW_SAMPLE_RATE` |

---

## 10. Data flow & trust boundaries

```text
Client → Gateway (AuthN/AuthZ) → emit AuditEvent
       → writeStandardAudit → L1 audit_logs
       → (if category high-value) → L2 audit_evidence + content_hash
       → Search/Export APIs (tenant-scoped)
```

| Boundary | Trust |
|----------|-------|
| Services → DB | Only via shared audit writer |
| Client → Audit APIs | JWT + permission; never client-supplied tenant without binder |
| Operators → DB | Prefer no manual DELETE; break-glass documented |

---

## 11. Threat model

| ID | Threat | Mitigation |
|----|--------|------------|
| A1 | Missing audit on sensitive action | Mandatory emitter matrix + tests |
| A2 | Cross-tenant audit read | Tenant UUID filter + AuthZ |
| A3 | Tamper / delete evidence | Append-only; hash; no delete API |
| A4 | Secret leakage in audit | Redaction helpers; schema allowlist |
| A5 | Audit DoS / volume | Rate limits; sampling on allows; async L2 |
| A6 | L1/L2 divergence | Dual-write metrics; reconcile job (later) |

---

## 12. Failure modes & recovery

| Failure | Behavior | Recovery |
|---------|----------|----------|
| L1 write fail | Request continues (default); metric `security.audit.write_fail` | Fix DB; backfill not required |
| L2 write fail | Metric + retry queue | Replay from L1 for high-value |
| Search overload | Pagination + timeouts | Indexes; read replicas later |
| Flag `AUDIT_EMIT=false` | Emitters no-op (except optional deny best-effort) | Re-enable |

---

## 13. Rollback

1. `AUDIT_L2_DUAL_WRITE=false` — stop evidence writes  
2. `AUDIT_EMIT=false` — stop new emits  
3. Code rollback to `v0.9.2-wave2`  
4. Do **not** drop `audit_logs` / `audit_evidence` without EAB  

---

## 14. Acceptance criteria

1. Schema v1.1 published and used by all Wave 3 emitters  
2. Dual-layer design implemented at least as L1 + L2 table/dual-write for mandatory categories  
3. Search + Export + Compliance Export + Evidence APIs live with OpenAPI  
4. Tenant isolation negative tests green  
5. Retention job design (and purge for L1) documented/runnable  
6. `content_hash` verified on evidence read  
7. Security Baseline §4 updated  
8. Wave 3 tests + validation script  
9. EAB Wave 3 review before Wave 4  

---

## 15. Implementation waves within Wave 3 (suggested)

| Step | Work | Exit |
|------|------|------|
| 3a | Schema migration 017 + shared types + redaction | Unit tests |
| 3b | Mandatory emitters | Integration tests |
| 3c | L2 table + dual-write | Hash tests |
| 3d | Search/Export/Evidence APIs | OpenAPI + negative tests |
| 3e | Retention job + docs + baseline | Wave review |

---

## 16. Governance

**No Wave 3 production coding until this SDS is Accepted by EAB.**

Cadence: SDS review → Accept → implement 3a–3e → test → docs → deploy/validate → Wave review → then Wave 4.
