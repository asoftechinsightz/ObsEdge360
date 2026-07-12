# Security Assessment — RC2

**Product:** OpsEdge360  
**Channel:** `v1.0.0-rc2-pilot`  
**Review type:** Internal control completion + residual risk register  
**Inherits:** Phase 4 OWASP posture via `/security/assessment`

## Controls completed in RC2

| Control | Status | Evidence |
|---------|--------|----------|
| RFC 6238 TOTP MFA | Implemented | `/me/mfa/enroll-totp`, `/me/mfa/verify-totp` |
| MFA at login (policy=`required`) | Implemented | Login returns `mfaRequired` + `POST /auth/mfa/verify` |
| MFA backup codes | Implemented (hashed) | Issued on first verify; regenerate API |
| Lab challenge codes | Gated | `OPS_MFA_LAB_CODES=1` only (default off) |
| Session list / revoke / revoke-all | Implemented | Security Center + APIs |
| Login history + risk score framework | Implemented | `login_history` + dashboard |
| Security dashboard | Implemented | `/security/dashboard` + UI |
| Security alerts | Implemented | Reuses `security_alerts` |
| API token rotate lifecycle | Implemented | `/security/api-tokens/:id/rotate` |
| Password rotation status | Implemented | `/me/password/rotation` surfaced on login |
| Risk-based auth | Framework only | Scores recorded; no automatic step-up |

## Inherited (prior phases)

OIDC/SAML SSO, LDAP/AD, RBAC/ABAC, security headers, secrets rotation, audit dual-layer, `AUTHZ_ENFORCE`, demo outbound kill-switch.

## Residual risk register (pilot disclosure)

| ID | Risk | Severity | Mitigation / disclosure |
|----|------|----------|-------------------------|
| R-01 | Session revoke updates DB only; JWT remains valid until expiry | Medium | Short JWT TTL in production; document in KNOWN_LIMITATIONS; backlog `jti` denylist |
| R-02 | TOTP secrets stored in `secret_enc` without encryption | Medium | Restrict DB access; encrypt-at-rest backlog; do not expose secret after enroll response |
| R-03 | RBA scores are informational | Low | Explicit framework-only; step-up not automatic |
| R-04 | Device inventory is label-only (`web`) | Low | Accept for pilot; enrich later |
| R-05 | Lab codes if misconfigured (`OPS_MFA_LAB_CODES=1` in prod) | High | Ops runbook: leave unset/false in customer pilots |

## Operator hardening checklist

1. Set strong `JWT_SECRET` (fail-closed in production if weak).  
2. Leave `OPS_MFA_LAB_CODES` unset for customer pilots.  
3. Set tenant MFA policy to `required` before go-live: `PUT /security/mfa-policy`.  
4. Confirm Security Center enroll → verify → backup codes once per admin.  
5. Review `/security/login-history` after first week of pilot.

## Verdict

RC2 meets the hybrid pilot security bar: production TOTP path, login enforcement when required, lab codes gated, Security Center usable. Residual risks R-01/R-02 must be disclosed; they do not block a controlled pilot if JWT TTL and DB controls are in place.
