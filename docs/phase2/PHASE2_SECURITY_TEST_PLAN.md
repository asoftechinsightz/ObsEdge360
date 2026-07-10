# Phase 2 — Security Test Plan

**Document ID:** OE360-P2-STP-001  
**Status:** PROPOSED  
**Release:** `v0.9.2`  

---

## 1. Objectives

Prove AuthN/AuthZ, tenancy, audit, and session hardening behave as designed before `v0.9.2` production promotion.

## 2. Test layers

| Layer | Scope |
|-------|-------|
| Unit | Permission resolver, tenant binder, audit mapper |
| API | Gateway routes: 401/403/200 matrices |
| Integration | Gateway → service with tenant filters |
| UI | Security dashboard access denied/allowed |
| Regression | Phase 1 health, topology, pipeline, agent-key |

## 3. Mandatory cases

| ID | Case | Expected |
|----|------|----------|
| S1 | No token on protected route | 401 |
| S2 | Valid token, missing permission | 403 |
| S3 | Valid token + permission | 200/2xx |
| S4 | Spoofed tenant header ≠ token tenant | 403/401 |
| S5 | Cross-tenant resource ID access | Denied |
| S6 | Mutation creates audit event | Event present |
| S7 | AuthZ deny creates audit event | Event present |
| S8 | Invalid agent key | 401 |
| S9 | Valid agent key on agent route | 2xx |
| S10 | Agent key on non-agent route | 401/403 |
| S11 | Session cookie flags post ADR-008 | HttpOnly/Secure/SameSite as designed |
| S12 | XSS cannot read session secret (if HttpOnly) | Not readable from JS |
| S13 | Security dashboard without `security:read` | 403 / redirect |
| S14 | No secrets in gateway logs (spot check) | Pass |
| S15 | Public ports remain localhost for DB/Redis/Kafka/GW | Pass |

## 4. Evidence

Attach CI logs, curl transcripts (redacted), and PRR security section. Fail release on any Critical finding.

## 5. Tools

Jest/unit · curl/httpie · optional OWASP ZAP smoke · Trivy (existing CI)
