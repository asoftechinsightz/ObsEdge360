# Phase 2 — Work Breakdown Structure (WBS)

**Document ID:** OE360-P2-WBS-001  
**Status:** PROPOSED  
**Release:** `v0.9.2` Security Foundation  
**Companion:** `PHASE2_IMPLEMENTATION_PLAN.md`  

Coding of WBS items is **blocked** until EAB approves the Phase 2 planning pack.

---

## 1. WBS dictionary

| ID | Work package | Milestone | Dependencies | Acceptance |
|----|--------------|-----------|--------------|------------|
| 2.0 | Phase 2 governance & ADR acceptance | Pre-M1 | Phase 1 approval | ADRs Accepted |
| 2.1 | Permission catalog & role seed model | M1 | 2.0 | Catalog documented + migration if needed |
| 2.2 | Gateway RBAC guard (deny default) | M1 | 2.1 | 403 on missing permission |
| 2.3 | Secure middleware (request context: user, roles, tenant) | M1 | 2.2 | Context available to controllers |
| 2.4 | OpenAPI security updates for AuthZ | M1 | 2.2 | Spec matches behavior |
| 2.5 | Unit/API negative tests for RBAC | M1 | 2.2 | CI green |
| 2.6 | Token-bound tenant enforcement | M2 | 2.3 | Spoofed `X-Tenant-Id` rejected |
| 2.7 | ABAC attribute checks (env/sensitivity as designed) | M2 | 2.6 | Policy tests pass |
| 2.8 | Cross-tenant isolation test pack | M2 | 2.6 | Read/write negatives pass |
| 2.9 | Audit event schema + DB migration (additive) | M3 | 2.0 | Tables created via new migration only |
| 2.10 | Audit emitters (login, deny, mutations) | M3 | 2.9, 2.2 | Events queryable |
| 2.11 | Secrets provider interface + env backend | M3 | ADR-014 | No behavior break; interface in shared pkg |
| 2.12 | Secret/log redaction review | M3 | 2.11 | Checklist signed |
| 2.13 | Compliance rule metadata foundation | M4 | ADR-012 | Create/list/evaluate stub or minimal engine |
| 2.14 | Security dashboard APIs | M4 | 2.10, 2.2 | RBAC-gated endpoints |
| 2.15 | Security dashboard baseline UI | M4 | 2.14 | Page loads for authorized role |
| 2.16 | Vuln management process + register linkage | M4 | ADR-018 | Process doc + optional API |
| 2.17 | Quantum Shield design note (no prod dep) | M4 | ADR-016 | Design accepted |
| 2.18 | Session hardening (ADR-008) | M5 | 2.3 | HttpOnly/BFF or approved alt live |
| 2.19 | CSRF / cookie regression suite | M5 | 2.18 | Tests pass |
| 2.20 | Security test plan execution | M6 | M1–M5 | Evidence attached |
| 2.21 | Performance impact validation | M6 | 2.2 | p95 within budget or waiver |
| 2.22 | Phase 2 deploy + rollback drill | M6 | 2.20 | Deploy plan executed |
| 2.23 | Phase 2 PRR + release notes `v0.9.2` | M6 | 2.22 | PRR recorded |
| 2.24 | Docs / OpenAPI / architecture sync | M6 | all | DoD met |

---

## 2. Parallelism

```text
2.0 ──► 2.1 ──► 2.2 ──► 2.3 ──► 2.6 ──► 2.7
              │              │
              ├─ 2.4, 2.5    └─ 2.8
              │
              └─ 2.9 ──► 2.10 ──► 2.14 ──► 2.15
                     └─ 2.11 ──► 2.12
2.13 (compliance) can start after 2.0
2.18 (session) after 2.3 stable
```

---

## 3. Non-goals (explicit)

- Full MFA product  
- Production Vault cutover  
- Service mesh mTLS  
- Dashboard Studio (Phase 5 / ADR-019)  
- LLM Gateway / RAG (Phase 4)  

---

## 4. Tracking

Update status in phase standup notes; close WBS items only when DoD criteria for that package are met.
