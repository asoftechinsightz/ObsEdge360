# API Change Log — RC2

**Compatibility:** Additive only. No breaking removals of RC1 routes.  
**Base path:** `/api/v1`

## Auth

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/auth/login` | Public | May return `{ accessToken, user }` **or** `{ mfaRequired: true, mfaToken, methods }` when MFA policy is `required` and user has an active factor |
| POST | `/auth/mfa/verify` | Public | Body `{ mfaToken, code }` → `{ accessToken, user }` |

### Login MFA challenge example

```http
POST /api/v1/auth/login
Content-Type: application/json

{"email":"admin@example.com","password":"..."}
```

```json
{
  "mfaRequired": true,
  "mfaToken": "<short-lived-jwt>",
  "user": { "email": "admin@example.com", "tenantId": "acme" },
  "methods": ["totp", "backup"]
}
```

```http
POST /api/v1/auth/mfa/verify
Content-Type: application/json

{"mfaToken":"<short-lived-jwt>","code":"123456"}
```

## Branding & demo

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/branding` | Public | Canonical OpsEdge360 product metadata |
| GET | `/demo/walkthrough` | Public | Executive 10–15 min talk track + incident script |
| POST | `/demo/reset` | Admin | Clears tour progress; re-enables tours; logs `demo_reset_runs` |

## Security

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/security/dashboard` | Admin | MFA policy, alerts, logins, counts |
| GET | `/security/login-history` | Admin | Queryable access events |
| GET | `/security/sessions` | Admin | Session inventory |
| POST | `/security/sessions/revoke-all` | Admin | Marks sessions revoked |
| POST | `/security/sessions/:id/revoke` | Admin | Single session |
| GET/POST | `/security/alerts` | Admin | List / create |
| POST | `/security/api-tokens/:id/rotate` | Admin | Rotate with `rotated_from` |
| POST | `/me/mfa/enroll-totp` | User | Production TOTP enroll |
| POST | `/me/mfa/verify-totp` | User | Activate factor + backup codes |
| POST | `/me/mfa/backup-codes` | User | Regenerate |
| GET | `/me/mfa/backup-codes/status` | User | Remaining count |
| GET | `/me/password/rotation` | User | Due status |
| POST | `/me/password/rotated` | User | Clear must-rotate flag |

## Performance & gate

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/performance/report` | Admin | Modeled capacity guidance |
| GET/POST | `/performance/benchmarks` | Admin | Record modeled profile (100–10k) |
| GET | `/rc2` | Admin | Gate overview |
| PUT | `/rc2/approve` | Admin | Requires token `RC2_PILOT_VALIDATION_OK` |
| GET | `/pilot/package` | User | Guide index |

## Env flags

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPS_MFA_LAB_CODES` | off | When `1`/`true`, accept deterministic lab challenge codes |
| `PASSWORD_MAX_AGE_DAYS` | `90` | Soft age check for rotation status |
| `MFA_RC1_ACCEPT_ANY` | off | Legacy Phase4 escape hatch — do not enable for pilots |
