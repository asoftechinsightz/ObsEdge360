# SDS-2.3 — Audit & Compliance Foundation

**Document ID:** OE360-SDS-2.3  
**Wave:** 3 — Audit & Compliance Foundation  
**Release:** `v0.9.2`  
**Status:** DRAFT — ready for EAB review before coding  
**Depends on:** Wave 1–2 deployed (`v0.9.2-wave2`), [SECURITY_BASELINE_v1.0](../../security/SECURITY_BASELINE_v1.0.md), [AUDIT_EVENT_SCHEMA](../AUDIT_EVENT_SCHEMA.md)  

---

## 1. Objectives

Make audit and compliance **systematic**: every security-relevant and compliance-relevant action emits a schema-conformant audit event; compliance evidence is queryable; retention and integrity controls are defined.

## 2. Scope (proposed)

**In:**
- Mandatory emitters for: login success/failure, refresh, AuthZ allow (sampled or config), AuthZ deny (already), admin mutations, role/permission changes, tenant-sensitive exports  
- Audit query API (tenant-scoped, RBAC-gated)  
- Retention policy metadata + purge job design  
- Compliance control mapping stubs (SOC2/ISO-aligned control IDs in metadata)  
- Integrity: append-only application pattern (no UPDATE/DELETE on `audit_logs` from app)  
- OpenAPI for audit APIs  
- Tests: emitter coverage, tenant isolation of audit reads, negative access  

**Out:** Full GRC product UI · SIEM export (Wave 5) · WORM storage · Legal hold workflows  

## 3. Data flow

```text
Action → shared-security writeStandardAudit(AuditEvent)
      → audit_logs (tenant_id UUID, metadata JSONB)
      → GET /api/v1/audit/events (AuthZ: audit:read / security:read)
```

## 4. Trust boundaries

| Boundary | Rule |
|----------|------|
| Writers | Services via shared helper only — no ad-hoc SQL inserts |
| Readers | Gateway API; tenant filter mandatory; admin cross-tenant only if future break-glass |
| Storage | Postgres; app must not update/delete audit rows |

## 5. Threat model (initial)

| ID | Threat | Mitigation |
|----|--------|------------|
| A1 | Audit gap on sensitive action | Emitter checklist + tests |
| A2 | Cross-tenant audit read | Tenant filter + AuthZ |
| A3 | Tamper with audit rows | No update API; DB grants later |
| A4 | PII over-collection | Schema field allowlist; redact secrets |

## 6. Acceptance criteria (draft)

1. Schema conformance for all new emitters  
2. Login/refresh/AuthZ deny covered  
3. Tenant-scoped audit list API with OpenAPI  
4. Negative tests for cross-tenant audit read  
5. Baseline §4 updated  
6. Rollback: feature flag `AUDIT_EMIT=false` (deny path still best-effort)  

## 7. Governance

SDS review → implement → test → docs → Wave 3 review → deploy/validate before Wave 4.
