# Security Architecture v1.0

**Document ID:** OE360-SEC-ARCH-1.0  
**Version:** 1.0  
**Status:** FROZEN  
**Effective:** 2026-07-10  

Honest baseline: **as-built + Phase 2 target**. Aspirational controls from older docs that are not implemented are marked **Target**.

---

## 1. Trust boundaries

```text
Internet → Nginx (TLS) → Web / API Gateway → Docker network → Services → Data stores
```

Docker network membership is **not** sufficient authorization.

## 2. As-built (v1.0)

| Control | Status |
|---------|--------|
| TLS at edge | Implemented (prod) |
| JWT validation at gateway | Implemented |
| Public route allowlist | Implemented (ADR-006) |
| Agent key auth | Implemented (ADR-004) |
| Health/metrics surfaces | Implemented (Phase 1) |
| Trivy CRITICAL CI gate | Implemented (ADR-007) |
| RBAC enforcement | **Not enforced** (Target Phase 2) |
| ABAC / hard tenancy | **Partial** (Target Phase 2) |
| HttpOnly session cookie | **Not done** (ADR-008 Phase 2) |
| Comprehensive audit | **Partial** (ADR-013 Phase 2) |
| Vault/KMS | **Not done** (ADR-014 / Phase 6) |
| mTLS service mesh | **Not done** (later) |

## 3. Phase 2 security spine (target)

Per ADR-009…018: gateway authz, tenancy, audit, secrets foundation, ZT foundation, vuln process, security dashboards; Quantum Shield non-blocking (ADR-016).

## 4. Security baseline

Operational minimum: `docs/governance/SECURITY_BASELINE.md`.

## 5. Related ADRs

ADR-004, 006, 007, 008, 009–018.

Legacy narrative: `17-SECURITY-ARCHITECTURE.md` (historical; defer to this v1.0 on conflict).
