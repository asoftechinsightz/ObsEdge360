# API Documentation (Commercial Index)

## Entry points

| Resource | Location |
|----------|----------|
| Live Swagger | `https://<host>/api/docs` |
| OpenAPI JSON | `/api/docs-json` or `/api/v1/openapi.json` |
| Packaged freeze | release tarball `openapi/openapi.json` |
| Wave9 API guide | `docs/Wave9/APIDocumentation.md` |
| RC2 API changelog | `docs/rc2/API_CHANGE_LOG.md` |
| RC3 compatibility | `docs/rc3/API_COMPATIBILITY_REPORT.md` |

## Auth

- `POST /api/v1/auth/login` — may return MFA challenge when policy=`required`  
- `POST /api/v1/auth/mfa/verify` — complete MFA  
- Bearer JWT includes `jti`; revoked sessions return 401  

## Pilot / commercial surfaces

| Path | Purpose |
|------|---------|
| `GET /branding` | Canonical product metadata |
| `GET /demo/walkthrough` | Executive talk-track |
| `GET /pilot/toolkit` | EPP doc index |
| `GET /rc3` | RC3 readiness |
| `GET /security/dashboard` | Security Center backend |

## Compatibility policy

Additive APIs only across RC1 → RC2 → RC3. No breaking removals in commercial channel without deprecation notice.
