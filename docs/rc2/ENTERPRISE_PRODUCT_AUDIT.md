# Enterprise Product Audit — OpsEdge360 RC2

**Scope:** Waves 1–9 + Phases 1–4 (RC1)  
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
| A-05 | Capacity guidance not customer-facing | Medium | M | **Fixed** — benchmark profiles API + report |
| A-06 | Demo reset not one-click | Medium | S | **Fixed** — `/demo/reset` |
| A-07 | Branding: historical `trinetra360` DB alias | Low | S | **Documented** — branding API note; no DB rename |
| A-08 | Browser synthetics = sim, not Chromium | Medium | L | Deferred (known limitation) |
| A-09 | SMS connector planned | Low | L | Deferred |
| A-10 | Full WCAG audit incomplete | Medium | L | Continuous; UiStates a11y roles added |
| A-11 | i18n strings English-only | Low | XL | Framework readiness only |
| A-12 | Helm chart subset of Compose services | Medium | L | Documented; no rewrite |
| A-13 | JWT default secret string still mentions legacy name | Low | S | Documented; production requires strong secret |
| A-14 | Duplicate admin security surfaces (Wave6 vs RC2) | Low | M | RC2 aggregates; Wave6 preserved |
| A-15 | PDF report binary missing | Medium | M | Deferred; CSV/JSON live |
| A-16 | Error/empty/loading inconsistent on older pages | Medium | M | Partial — new pages + shared UiStates |
| A-17 | npm audit high vulns in gateway deps | Medium | M | Monitored; Trivy CI continues |
| A-18 | Air-gap docs need clean-env dry-run evidence | Medium | S | Validated via artifact presence + guide |

---

## Detailed findings

### A-01 — MFA lab path insufficient for security review
- **Severity:** High  
- **Business impact:** Blocks security / procurement reviews for pilots.  
- **Technical impact:** Authenticator apps could not verify RC1 challenge codes as real TOTP.  
- **Recommended action:** Implement RFC 6238 TOTP + backup codes; keep lab fallback for automation.  
- **Estimated effort:** M (2–3 days)  
- **RC2 status:** Done (`/me/mfa/enroll-totp`, `/me/mfa/verify-totp`)

### A-02 — Login history gap
- **Severity:** Medium  
- **Business impact:** SOC teams cannot evidence access attempts.  
- **Technical impact:** Lockouts existed without durable event stream.  
- **Recommended action:** Persist login success/failure with risk score.  
- **Estimated effort:** S  
- **RC2 status:** Done

### A-03 — Session management discoverability
- **Severity:** Medium  
- **Business impact:** Hard to revoke devices during incidents.  
- **Technical impact:** `user_sessions` existed; UX incomplete.  
- **Recommended action:** Security Center + revoke-all.  
- **Estimated effort:** S  
- **RC2 status:** Done

### A-04 — Pilot packaging incomplete
- **Severity:** High  
- **Business impact:** Sales/CS cannot run structured pilots.  
- **Technical impact:** Docs fragmented across phase folders.  
- **Recommended action:** Dedicated pilot package under `docs/rc2/`.  
- **Estimated effort:** M  
- **RC2 status:** Done

### A-05 — Performance storytelling for enterprises
- **Severity:** Medium  
- **Business impact:** Architecture reviews ask for 100–10k user guidance.  
- **Technical impact:** Wave7 soak is gated; no customer-facing profile pack.  
- **Recommended action:** Modeled capacity benchmarks + report; live soak remains staging.  
- **Estimated effort:** M  
- **RC2 status:** Done (modeled; live CERT still Wave7)

### A-07 — Legacy naming in DB/docs
- **Severity:** Low  
- **Business impact:** Brand confusion in reviews.  
- **Technical impact:** Production DB name `trinetra360` is frozen alias.  
- **Recommended action:** Canonical branding API; do **not** rename DB.  
- **Estimated effort:** S  
- **RC2 status:** Documented

### A-08 / A-09 / A-15 — Known product gaps
Deferred with explicit known issues; not blockers for pilot if disclosed.

---

## Architecture quality verdict

Stable DDD modular gateway + services. No rewrite required. RC2 correctly extends productization surfaces.

## Priority backlog (post-RC2)

1. Real Chromium browser worker (optional feature flag)  
2. Native PDF rendering for reports  
3. Full WCAG 2.2 AA audit pass  
4. Expand Helm to full microservice set  
5. SMS connector + risk-based step-up enforcement hooks
