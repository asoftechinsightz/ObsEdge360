# Phase 2 — Security Threat Model

**Document ID:** OE360-P2-TM-001  
**Status:** PROPOSED  
**Release:** `v0.9.2`  
**Method:** STRIDE-oriented · gateway-centric  

---

## 1. Assets

| Asset | Sensitivity |
|-------|-------------|
| JWT / session | Critical |
| Agent API keys | Critical |
| Tenant operational data (CMDB, obs, tx) | High |
| Audit logs | High |
| Postgres `trinetra360` | Critical |
| Secrets in host `.env` | Critical |
| RBAC permission assignments | High |

## 2. Trust boundaries

1. Internet → Nginx (TLS)  
2. Nginx → Gateway / Web (Docker network)  
3. Gateway → microservices  
4. Services → Postgres / Redis / Kafka  
5. Operator browser (XSS surface)  

## 3. Key threats & mitigations (Phase 2)

| ID | Threat | STRIDE | Mitigation in Phase 2 |
|----|--------|--------|------------------------|
| T1 | Privilege escalation via missing AuthZ | E | RBAC deny-default (ADR-010) |
| T2 | Cross-tenant data access | T/I | Token-bound tenant + tests (ADR-011) |
| T3 | JWT theft via XSS (non-HttpOnly cookie) | I | ADR-008 session hardening |
| T4 | Agent key reuse / leak | S/E | Rotation docs; negative tests; TLS only |
| T5 | AuthZ bypass on new routes | E | Secure middleware + OpenAPI review |
| T6 | Audit gaps / repudiation | R | ADR-013 audit emitters |
| T7 | Secret sprawl / `.env` theft | I | ADR-014 interface; host ACL; no log secrets |
| T8 | Public data-plane re-exposure | I | Keep localhost binds; compose review in deploy |
| T9 | Compliance over-claim | — | Foundation only; honest docs (ADR-012) |
| T10 | Quantum feature dependency risk | D | Design-only (ADR-016) |

## 4. Residual risks (accepted interim)

- No full Vault yet (R-SEC-005)  
- MFA not fully productized  
- Shared VPS with other stacks  

## 5. Validation

Execute `PHASE2_SECURITY_TEST_PLAN.md`; update Risk Register after each milestone.
