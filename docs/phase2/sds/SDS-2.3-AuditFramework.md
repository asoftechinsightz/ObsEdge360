# SDS-2.3 — Audit & Compliance Foundation

**Document ID:** OE360-SDS-2.3  
**Wave:** 3 — Audit & Compliance Foundation  
**Release:** `v0.9.2`  
**Status:** ✅ **ACCEPTED WITH CONDITIONS** (EAB 2026-07-11) — conditions incorporated below  
**ADRs:** 012, 013  
**Depends on:** Wave 2 closed (`v0.9.2-wave2`), [SECURITY_BASELINE_v1.0](../../security/SECURITY_BASELINE_v1.0.md)  
**Coding:** ✅ Authorized after this revision  

---

## 1. Objectives

Deliver a dual-layer, API-first audit foundation:

1. **Layer 1 — Operational Audit** — fast, searchable, short retention, UI-ready.  
2. **Layer 2 — Compliance Evidence** — durable, integrity-verified, long retention, via **async queue**.  
3. Policy-driven retention, verification APIs, metrics, and tests — without UEBA/dashboards in Wave 3.

## 2. EAB conditions (binding)

| # | Condition | Incorporation |
|---|-----------|---------------|
| C1 | Versioned event schema from day one | `schemaVersion` mandatory; schema v1.1 |
| C2 | Async evidence pipeline (not sync L2) | App → **Audit Queue** → Evidence Writer → Compliance Storage |
| C3 | Documented immutability strategy | §9 |
| C4 | Policy-driven retention (not fixed only) | §8 retention classes |
| C5 | Explicit API set | §10 |
| C6 | Wave 3 minimum / defer list | §3 |
| C7 | Measurable acceptance criteria | §14 |

---

## 3. Wave 3 scope

### Mandatory

- Dual-write path: L1 sync + L2 via **audit queue**  
- Operational store (`audit_logs`)  
- Compliance evidence store (`audit_evidence`)  
- Durable outbox/queue + evidence writer  
- Retention policies (policy-driven)  
- Search API  
- Integrity verification API  
- Ingest API (service/internal)  
- Evidence export API  
- Retention management API  
- Legal hold API (foundation / stub enforceable)  
- Health monitoring + security/audit metrics  
- Tests (unit, integration, negative, restart/at-least-once)

### Defer (post–Wave 3)

- AI anomaly detection · behaviour analytics · risk scoring · UEBA  
- Compliance dashboards · executive reporting  
- Full WORM/Object Lock cloud archive  
- Digital signature issuance (field reserved)  
- Periodic Merkle tree verification job (design only in Wave 3)

---

## 4. Architecture

```text
Application / Gateway
        │
        ├──────────────────────────────► Layer 1: Operational Audit (sync, best-effort)
        │                                 audit_logs  (30–90d typical)
        │
        └──────────────────────────────► Audit Queue (durable outbox [+ Kafka topic optional])
                                                │
                                                ▼
                                         Evidence Writer
                                                │
                                                ▼
                                         Layer 2: Compliance Storage
                                         audit_evidence (immutable intent, long retention)
```

**Rationale:** Async L2 reduces request latency, enables retry/back-pressure, isolates failures, and scales independently from the request path.

**At-least-once:** Outbox rows remain until writer ACK; idempotent evidence insert on `event_id`.

---

## 5. Event model (schema v1.1 — stable)

`schemaVersion`: **`1.1`**

### Mandatory fields (EAB)

| Field | Type | Notes |
|-------|------|-------|
| eventId | UUID | Stable unique id |
| tenantId | UUID | Tenant |
| organizationId | UUID | Org; Wave 3 maps to tenant id unless separate org model exists |
| timestamp | ISO-8601 UTC | Server time |
| eventCategory | enum string | See §6 |
| eventType | string | Specific type within category |
| actor | string/UUID | Actor identifier |
| actorType | string | `user` \| `system` \| `api_key` \| `service` |
| resourceType | string | |
| resourceId | string | |
| action | string | Canonical action |
| outcome | string | `success` \| `failure` \| `allow` \| `deny` \| `n/a` |
| severity | string | `low` \| `medium` \| `high` \| `critical` \| `info` |
| sourceService | string | Emitting service |
| environment | string | `production` \| `staging` \| `development` |
| correlationId | string | |
| traceId | string | |
| sessionId | string | |
| clientIp | string | |
| userAgent | string | |
| beforeHash | string \| null | State hash before change |
| afterHash | string \| null | State hash after change |
| metadata | object | Extensible; **no secrets** |
| signature | string \| null | Reserved (future digital signatures) |
| schemaVersion | string | e.g. `1.1` |

Legacy Wave 2 fields (`decision`, `permission`, `reason`, `riskScore`, `policy`) map into `outcome` / `metadata` for compatibility.

---

## 6. Event categories

| Category | Coverage |
|----------|----------|
| Identity & Authentication | login, logout, refresh, SSO, password reset |
| Authorization | allow/deny, tenant spoof |
| Configuration Changes | connectors, feature flags, service config |
| Infrastructure Lifecycle | CI create/update/delete (when emitted) |
| Secrets & Key Management | API key issue/revoke |
| API Access | sensitive API access (sampled/config) |
| Data Access | bulk reads of sensitive resources |
| Data Export | audit/compliance exports |
| Administrative Actions | user/role admin |
| Deployment & Release | deploy markers (selective) |
| Policy Changes | RBAC/ABAC policy mutations |
| Backup & Restore | backup/restore jobs (when wired) |
| Tenant Administration | tenant create/update |
| Integration Events | webhooks/outbound |
| AI/Automation Decisions | agent/AI execute (emit when used; analytics deferred) |

Wave 3 **mandatory emitters:** Identity & Authentication, Authorization (deny always; allow optional/sampled), Administrative Actions, Policy Changes, Data Export, Secrets & Key Management (if APIs used).

---

## 7. Storage

| Store | Table | Role |
|-------|-------|------|
| Operational | `audit_logs` | Layer 1 hot path |
| Queue | `audit_evidence_outbox` | Durable audit queue |
| Compliance | `audit_evidence` | Layer 2 evidence (not `compliance_evidence` control artifacts) |
| Policy | `audit_retention_policies` | Per-tenant/class retention |
| Legal hold | `audit_legal_holds` | Hold markers |

Optional: Kafka topic `audit.evidence` mirrors outbox for future independent writers (`KAFKA_ENABLED`).

---

## 8. Retention (policy-driven)

| Class | Typical retention | Notes |
|-------|-------------------|-------|
| Operational | 30–90 days | L1 purge job |
| Security | 1 year | Prefer L2 for security-class events |
| Compliance | 7 years | L2 default |
| Financial | Policy-driven | Tenant policy row |
| Legal Hold | Indefinite until released | Suppresses purge |

Defaults live in `audit_retention_policies`; operators change via Retention Management API — **not** hard-coded only in code.

---

## 9. Immutability strategy

| Capability | Wave 3 | Future |
|------------|--------|--------|
| Append-only application writes | ✅ | |
| No UPDATE/DELETE evidence APIs | ✅ | |
| `content_hash` (SHA-256 canonical payload) | ✅ | |
| Idempotent insert on `event_id` | ✅ | |
| `signature` field reserved | ✅ nullable | Issue signatures |
| Hash chaining (`prev_hash`) | Design note | ✅ |
| Periodic Merkle verification | Design note | ✅ |
| WORM / Object Lock archive | Design note | ✅ |

**Wave 3 defensibility:** hash verification API + append-only L2 + legal hold foundation.

---

## 10. APIs

| API | Method | Purpose |
|-----|--------|---------|
| **Audit ingestion** | `POST /api/v1/audit/events` | Ingest (service/admin); also used internally |
| **Audit search** | `GET /api/v1/audit/events` | Operational search (L1) |
| **Evidence export** | `GET /api/v1/audit/evidence/export` | Compliance pack (L2) |
| **Integrity verification** | `GET /api/v1/audit/evidence/:id/verify` | Recompute vs `content_hash` |
| **Retention management** | `GET/PUT /api/v1/audit/retention` | Policy CRUD (tenant-scoped) |
| **Legal hold** | `POST/DELETE /api/v1/audit/legal-holds` | Create/release hold |

All tenant-scoped via Wave 2 binder; AuthZ via centralized engine (`security:read` / `audit:*` / `compliance:read` as appropriate). OpenAPI required.

---

## 11. Performance & reliability

| Target | Value |
|--------|-------|
| L1 write under normal ops | **100% success** best-effort with metric on failure; default fail-open on request path |
| L2 delivery | **At-least-once** via outbox |
| Restart | No loss of queued evidence (outbox durable) |
| Queue recovery | Writer resumes after interruption |
| Search latency | p95 &lt; **500ms** for 7-day tenant filter, page ≤ 100 (target under expected load) |
| L2 sync on request path | **Forbidden** — queue only |

---

## 12. Security, metrics, health

**Flags:** `AUDIT_EMIT`, `AUDIT_L2_QUEUE`, `AUDIT_ALLOW_SAMPLE_RATE`, `AUDIT_FAIL_CLOSED` (default false).

**Metrics:** `security.audit.write_fail`, `security.audit.l1_success`, `security.audit.queue_enqueued`, `security.audit.l2_written`, `security.audit.verify_fail`, `security.audit.queue_depth`.

**Health:** Writer heartbeat + outbox depth exposed on gateway ops/metrics path.

---

## 13. Threat model & rollback

Unchanged intent from prior draft: gap coverage, cross-tenant read prevention, tamper resistance, secret redaction, volume DoS via sampling/back-pressure.

**Rollback:** disable `AUDIT_L2_QUEUE` / `AUDIT_EMIT`; redeploy `v0.9.2-wave2`; never drop audit tables without EAB.

---

## 14. Acceptance criteria (measurable)

1. **100%** successful L1 writes under normal operation (failures only when DB down; metriced).  
2. **At-least-once** delivery for compliance (L2) records.  
3. Evidence **integrity verification passes** for written records.  
4. **No loss** of queued evidence across service restart.  
5. **Configurable retention** policies enforced by purge job (respect legal hold).  
6. **Queue recovery** after writer interruption.  
7. Audit search meets **latency target** under expected load (smoke + documented).  
8. OpenAPI + tests + Security Baseline §4 → v1.1 notes.  
9. Dual-layer async pipeline only (no sync L2 on request path).

---

## 15. Governance

SDS Accepted with Conditions → this revision → implement Wave 3 minimum → test → deploy/validate → Wave 3 review → Wave 4.
