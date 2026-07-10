# Phase 2 — Implementation Plan

**Document ID:** OE360-P2-PLAN-001  
**Status:** PROPOSED — awaiting EAB approval  
**Phase title:** Enterprise Security & Compliance Foundation  
**Target release:** `v0.9.2` — Security Foundation  
**Depends on:** Phase 1 Approved with Operational Conditions  
**Coding:** ❌ Forbidden until this plan + companion docs + ADRs are Accepted  

---

## 1. Goals

Establish enforceable security and compliance foundations on the live OpsEdge360 platform without breaking production locks or Phase 1 API compatibility.

**In scope (foundation):** RBAC, ABAC, tenant isolation validation, secure middleware, secrets management foundation, API authorization, security audit logging, compliance rule-engine foundation, Zero Trust foundation, security dashboard foundation.

**Design-only:** Quantum Shield (ADR-016) unless EAB expands.

**Out of scope:** Full MFA productization, Vault/KMS production cutover (interface only), Studio, LLM Copilot, Helm/CD, industry pack marketplace.

---

## 2. Guiding constraints

- Production locks: domains, `trinetra360`, Nginx/SSL, volumes, migrations 001–014  
- Backward compatible `/api/v1` unless versioned break approved  
- Deny-by-default authorization at gateway  
- DoD / DoR / Release Checklist mandatory  
- Runnable after every milestone  

---

## 3. Milestones

| ID | Milestone | Outcomes | Exit |
|----|-----------|----------|------|
| M1 | AuthZ spine | Gateway RBAC middleware; permission catalog; deny default | Unit + negative API tests |
| M2 | Tenancy + ABAC | Token-bound tenant; ABAC attributes; cross-tenant negative tests | Isolation test pack green |
| M3 | Audit + secrets | Audit event schema + emitters; secrets provider interface (env backend) | Audit query smoke; no secrets in logs |
| M4 | Compliance + dashboard foundations | Rule engine schema/API foundation; security dashboard APIs + baseline UI | OpenAPI updated; RBAC-gated |
| M5 | Session hardening path | ADR-008 implementation (HttpOnly/BFF or approved alternative) | Auth regression + CSRF review |
| M6 | Validate & release | Security tests, perf impact, PRR, docs, `v0.9.2` notes | PRR PASS / PASS WITH CONDITIONS |

Quantum Shield design note delivered by M4 (no prod dependency).

---

## 4. ADR map

| ADR | Role in Phase 2 |
|-----|-----------------|
| 008 | Session cookie hardening — implement |
| 009 | Enterprise security architecture — accept |
| 010 | RBAC & ABAC — accept + implement |
| 011 | Multi-tenant model — accept + implement |
| 012 | Compliance rule engine — foundation |
| 013 | Audit logging — accept + implement |
| 014 | Secrets management — foundation interface |
| 015 | Zero Trust foundation — accept |
| 016 | Quantum Shield — design only |
| 017 | Security dashboard — foundation |
| 018 | Vuln management framework — process + light product |

---

## 5. Workstreams

1. **Gateway security** — guards, permission resolver, tenant binder  
2. **Data** — additive migrations for audit/permissions if needed (015+ only)  
3. **Shared libraries** — extend `@opsedge360/shared-security`  
4. **Compliance service** — rule metadata foundation  
5. **Web** — security dashboard foundation pages (RBAC-gated)  
6. **Ops** — deploy plan, rollback, monitoring of authz deny rates  

Detailed tasks: `PHASE2_WBS.md`.

---

## 6. Acceptance criteria (phase)

1. Unauthenticated protected routes → 401  
2. Authenticated without permission → 403  
3. Cross-tenant read/write attempts fail  
4. Mutations emit audit events  
5. OpenAPI documents security schemes and new APIs  
6. No Critical/High open bugs without EAB waiver  
7. Phase 2 PRR completed  
8. Production remains deployable; locks intact  

---

## 7. Schedule (indicative)

| Week | Focus |
|------|-------|
| 1 | ADR acceptance, M1 AuthZ spine |
| 2 | M2 Tenancy/ABAC |
| 3 | M3 Audit/secrets + M4 start |
| 4 | M4–M5 + security/perf validation |
| 5 | M6 PRR, docs, `v0.9.2` release train |

Adjust after EAB approval.

---

## 8. Companion documents (required)

| Doc | Path |
|-----|------|
| WBS | `PHASE2_WBS.md` |
| HLD v1.1 | `docs/architecture/HLD_v1.1.md` |
| LLD v1.1 | `docs/architecture/LLD_v1.1.md` |
| Threat model | `PHASE2_SECURITY_THREAT_MODEL.md` |
| Security test plan | `PHASE2_SECURITY_TEST_PLAN.md` |
| Performance impact | `PHASE2_PERFORMANCE_IMPACT.md` |
| Rollback | `PHASE2_ROLLBACK_STRATEGY.md` |
| Deployment | `PHASE2_DEPLOYMENT_PLAN.md` |
| Risk register | `docs/governance/RISK_REGISTER.md` |

---

## 9. EAB decision

| Field | Value |
|-------|-------|
| Plan status | ☐ Approved · ☐ Approved with conditions · ☐ Rejected |
| Date | |
| Conditions | |
