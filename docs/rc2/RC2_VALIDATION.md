# RC2 Validation

**Script:** `scripts/vps-rc2-validate.sh`  
**Token:** `RC2_PILOT_VALIDATION_OK`

## Production evidence

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| SHA | `a2d7e44ec25dbd2eb9ae11255282d6b60f086f6f` |
| Short SHA | `a2d7e44` |
| Branch | `feature/rc2-pilot-production-readiness` |
| Host | api.observability360.asoftechinsightz.com |
| Migrations | 045 + 046 |
| Result | **pass=31 fail=0** |
| Token | `RC2_PILOT_VALIDATION_OK` |

### Checks

health, migration 045 (`rc2_readiness`), migration 046 (`mfa_challenge` CHECK), docs pack, branding product=`OpsEdge360`, executive walkthrough, signup, TOTP enroll/verify (RFC 6238), backup codes, MFA policy `required`, login MFA challenge + `/auth/mfa/verify`, security dashboard/login-history/sessions, security alert, demo reset, modeled benches 100–10k, pilot package, RC2 approve, RC1 about compat, Phase 3 reports compat, GA admin compat, deployment artifacts (compose/helm/airgap).

### Rollback baseline

RC1 SHA `ac6c6ba58ef72b16e24d93a4be30215795577c97` (`P4_RC1_MARKET_VALIDATION_OK`).
