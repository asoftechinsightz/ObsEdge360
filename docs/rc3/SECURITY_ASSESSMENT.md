# Security Assessment — RC3 / EPP

## Closed in RC3

| Control | Status |
|---------|--------|
| TOTP secrets encrypted at rest | AES-256-GCM via `SECRETS_MASTER_KEY` (`oe360:v1:…` envelope) |
| Legacy plaintext secrets | Re-encrypted on successful verify |
| JWT `jti` bound to `user_sessions` | Revoke → subsequent API calls 401 |
| Lab MFA codes | Remain gated (`OPS_MFA_LAB_CODES`) |
| Gateway SIGTERM shutdown | `enableShutdownHooks` + handlers |

## Inherited

RC2 MFA-at-login, backup codes, Security Center, login history, API token rotate, SSO/RBAC.

## Residual / backlog

| ID | Item | Severity |
|----|------|----------|
| R-01 | Risk-based step-up still framework-only | Low |
| R-02 | Device inventory still label-light | Low |
| R-03 | Helm still gateway/web subset | Medium |
| R-04 | Full SIEM export not productized | Medium |

## Operator notes

1. Set `SECRETS_MASTER_KEY` (32-byte base64 preferred) before MFA enroll in production.  
2. Optional `JWT_REQUIRE_SESSION=true` rejects tokens whose `jti` row is missing.  
3. Prefer shorter `JWT_EXPIRES_IN` for high-sensitivity pilots.

## Verdict

RC3 closes the two RC2 residuals that most often fail security reviews (secret at rest + revoke). Suitable for regulated pilot disclosure with R-01–R-04 noted.
