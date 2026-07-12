# Enterprise Product Audit — OpsEdge360 RC2

**Scope:** Waves 1–9 + Phases 1–4 (RC1) + RC2 hardening  
**Date:** 2026-07-12  
**Method:** Architecture, UX, API, DB, security, performance, docs, a11y, i18n readiness, debt review  
**Principle:** Prioritize high-impact fixes; do not auto-remediate everything.

---

## Finding summary

| ID | Area | Severity | Effort | Action in RC2 |
|----|------|----------|--------|---------------|
| A-01 | MFA used lab challenge codes only | High | M | **Fixed** — RFC6238 TOTP + backup codes |
| A-02 | Login failures not in queryable history | Medium | S | **Fixed** — `login_history` |
| A-03 | Session revoke UX buried in Wave6 admin | Medium | S | **Fixed** — Security Center + revoke APIs |
| A-04 | No customer pilot package | High | M | **Fixed** — docs/rc2 pilot pack |
| A-05 | Capacity guidance not customer-facing | Medium | M | **Fixed** — modeled profiles API + report (Wave7 for live soak) |
| A-06 | Demo reset not one-click | Medium | S | **Fixed** — `/demo/reset` + confirmation UX |
| A-07 | Branding: historical `trinetra360` DB alias | Low | S | **Documented** — branding API note; no DB rename |
| A-08 | Browser synthetics = sim, not Chromium | Medium | L | Deferred (known limitation) |
| A-09 | SMS connector planned | Low | L | Deferred |
| A-10 | Full WCAG audit incomplete | Medium | L | Continuous; UiStates a11y roles added |
| A-11 | i18n strings English-only | Low | XL | Framework readiness only |
| A-12 | Helm chart subset of Compose services | Medium | L | Documented; no rewrite |
| A-13 | JWT default secret string still mentions legacy name | Low | S | Documented; production requires strong secret |
| A-14 | Duplicate admin security surfaces (Wave6 vs RC2) | Low | M | RC2 aggregates; Wave6 preserved |
| A-15 | PDF report binary missing | Medium | M | Deferred; CSV/JSON live |
| A-16 | Error/empty/loading inconsistent on older pages | Medium | M | Partial — RC2 pages + shared UiStates |
| A-17 | npm audit high vulns in gateway deps | Medium | M | Monitored; Trivy CI continues |
| A-18 | Air-gap docs need clean-env dry-run evidence | Medium | S | Commands documented in DEPLOYMENT_VALIDATION |
| A-19 | MFA not enforced at password login | High | M | **Fixed** — challenge + `POST /auth/mfa/verify` when policy=`required` and factor active |
| A-20 | Lab challenge codes accepted in production path | High | S | **Fixed** — gated behind `OPS_MFA_LAB_CODES` (default off) |
| A-21 | Session revoke does not invalidate JWTs | Medium | L | **Accepted residual** — inventory revoke until JWT TTL |
| A-22 | TOTP secrets stored plaintext (`secret_enc` misnomer) | Medium | M | **Accepted residual** — encrypt-at-rest backlog |
| A-23 | Device management label-only | Low | M | **Accepted residual** — `device_label='web'` |

---

## Detailed findings (RC2 deltas)

### A-19 — MFA not enforced at authentication
- **Severity:** High  
- **Business impact:** Security reviews reject “MFA available but not required at login.”  
- **Technical impact:** JWT issued after password only.  
- **Recommended action:** Challenge token + TOTP/backup verify before access token.  
- **Estimated effort:** M  
- **RC2 status:** Done (`mfaRequired` + `/auth/mfa/verify`)

### A-20 — Lab codes on production verify path
- **Severity:** High  
- **Business impact:** Weak second factor if left enabled.  
- **Technical impact:** Deterministic SHA256 challenge accepted as TOTP.  
- **Recommended action:** Gate with `OPS_MFA_LAB_CODES=1` for automation only.  
- **Estimated effort:** S  
- **RC2 status:** Done

### A-21 / A-22 — Accepted residuals for pilot disclosure
Documented in KNOWN_LIMITATIONS and SECURITY_ASSESSMENT. Not blockers if disclosed to the pilot customer.

---

## Architecture quality verdict

Stable DDD modular gateway + services. No rewrite required. RC2 correctly extends productization and auth enforcement without breaking RC1 surfaces.

## Priority backlog (post-RC2)

1. Session-bound JWT / `jti` denylist on revoke  
2. Encrypt MFA secrets at rest  
3. Real Chromium browser worker (optional feature flag)  
4. Native PDF rendering for reports  
5. Full WCAG 2.2 AA audit pass  
6. Expand Helm to full microservice set  
7. SMS connector + risk-based step-up enforcement hooks  
