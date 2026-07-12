# RC3 Validation

**Script:** `scripts/vps-rc3-validate.sh`  
**Token:** `RC3_EPP_VALIDATION_OK`

## Production evidence

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| SHA | `4f39eec43d15055b087894ed667432c02a4e26b8` |
| Short SHA | `4f39eec` |
| Branch | `feature/rc3-enterprise-pilot-program` |
| Host | api.observability360.asoftechinsightz.com |
| Migration | 047 |
| Result | **pass=18 fail=0** |
| Token | `RC3_EPP_VALIDATION_OK` |

### Checks

health, migration 047 (`rc3_readiness`), `user_sessions.jti`, RC3+pilot docs, signup with JWT `jti`, MFA enroll/verify, MFA secret encrypted (`oe360:v1:`), session revoke → JWT 401, relogin, `/rc3`, `/rc3/security`, `/pilot/toolkit`, Banking360, RC3 approve, branding compat.

### Baselines

| Release | SHA | Token |
|---------|-----|-------|
| RC2 | `a2d7e44ec25dbd2eb9ae11255282d6b60f086f6f` | `RC2_PILOT_VALIDATION_OK` |
| RC1 | `ac6c6ba58ef72b16e24d93a4be30215795577c97` | `P4_RC1_MARKET_VALIDATION_OK` |
