# API Change Log — RC2

Additive only; no breaking changes.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/branding` | Public canonical branding |
| GET | `/demo/walkthrough` | Public executive talk track |
| GET | `/rc2` | RC2 overview |
| PUT | `/rc2/approve` | Token `RC2_PILOT_VALIDATION_OK` |
| GET | `/pilot/package` | Pilot doc index |
| GET | `/security/dashboard` | Security center |
| GET | `/security/login-history` | Login events |
| GET | `/security/sessions` | Device/sessions |
| POST | `/security/sessions/revoke-all` | Revoke |
| POST | `/security/sessions/:id/revoke` | Revoke one |
| GET/POST | `/security/alerts` | Alerts |
| POST | `/me/mfa/enroll-totp` | RFC6238 enroll |
| POST | `/me/mfa/verify-totp` | Verify + backup codes |
| POST | `/me/mfa/backup-codes` | Regenerate |
| GET | `/me/mfa/backup-codes/status` | Remaining |
| GET | `/me/password/rotation` | Rotation status |
| POST | `/me/password/rotated` | Mark rotated |
| POST | `/security/api-tokens/:id/rotate` | Token lifecycle |
| POST | `/demo/reset` | Demo reset |
| GET | `/performance/report` | Benchmark guide |
| GET/POST | `/performance/benchmarks` | Capacity profiles |

RC1 routes remain unchanged. Phase 4 MFA verify now also accepts real TOTP.
