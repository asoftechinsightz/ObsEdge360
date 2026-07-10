# Security Baseline

**Document ID:** OE360-SEC-BASE-001  
**Version:** 1.0  
**Status:** FROZEN  
**Effective:** 2026-07-10  
**Authority:** EAB / Security Architect  

Minimum security controls required for any OpsEdge360 release. Phase-specific work may exceed this baseline; it must not fall below it without an EAB exception.

---

## 1. Identity & authentication

| Control | Baseline |
|---------|----------|
| User API auth | JWT validated at gateway for non-public routes |
| Public routes | Explicit allowlist only (ADR-006) |
| Agent auth | `X-Agent-Key` on designated routes (ADR-004) |
| Passwords | Hashed at rest; never logged |
| Session cookie | Documented risk until ADR-008 implemented (Phase 2) |
| MFA | Required design in Phase 2; not yet baseline-enforced |

## 2. Authorization

| Control | Baseline (current) | Target (Phase 2) |
|---------|--------------------|------------------|
| RBAC | Library/tables may exist; **enforcement incomplete** | ADR-010 enforced at gateway |
| ABAC / tenant | Header/claim present; isolation not fully validated | ADR-011 |
| Deny default | Not fully true today | Required after ADR-010 |

Residual risk accepted until Phase 2: **R-SEC-002**, **R-SEC-003**.

## 3. Transport & edge

| Control | Baseline |
|---------|----------|
| Public TLS | Nginx terminates TLS for web + API domains |
| HTTP→HTTPS | Redirect expected in prod |
| Internal Docker network | Not a substitute for authz |
| Certificate expiry | Monitored; PRR checks validity |

## 4. Secrets

| Control | Baseline |
|---------|----------|
| Secrets in git | **Forbidden** |
| Secrets in client bundles | **Forbidden** |
| Host env / `.env` | Allowed for VPS today; inventory + rotation docs required |
| Logging secrets | **Forbidden** |
| Future | ADR-014 interface → Vault/KMS in Phase 6 |

## 5. Application security

| Control | Baseline |
|---------|----------|
| OWASP Top 10 | Reviewed each PRR |
| Input validation | Boundary validation on new APIs |
| Dependency CVEs | Trivy **CRITICAL** fails CI (ADR-007) |
| HIGH CVEs | Reviewed; waiver via EAB if needed |
| SQL | Parameterized queries; no string-concat SQL |

## 6. Audit & monitoring

| Control | Baseline (current) | Target |
|---------|--------------------|--------|
| App logs | Structured where adopted | Universal |
| Security audit trail | Partial | ADR-013 |
| Health endpoints | `/health`, `/ready`, `/live`, `/version`, `/metrics` | Required on prod services |
| Alerts | Documented in PRR (may be N/A with residual risk) | Phase 3 depth |

## 7. Production locks (security-relevant)

Do not change without change control: public domains, `trinetra360`, Nginx/SSL paths, volume names, migrations **001–014**.

## 8. Related

- ADR-009 … ADR-018 · `RISK_REGISTER.md` · `CODING_STANDARDS.md` · `docs/architecture/SECURITY_ARCHITECTURE_v1.0.md`  
