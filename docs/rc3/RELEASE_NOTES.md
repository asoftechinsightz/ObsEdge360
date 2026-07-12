# Release Notes — OpsEdge360 RC3 (`v1.0.0-rc3-epp`)

## Highlights

- Enterprise Pilot Program toolkit (`docs/pilot/`)  
- TOTP MFA secrets encrypted at rest (AES-256-GCM)  
- Session revoke invalidates JWTs via `jti` binding  
- API gateway graceful shutdown  
- RC3 readiness APIs and documentation pack  

## Compatibility

Additive migration 047. RC2/RC1 routes preserved.

## Validation

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| SHA | `4f39eec43d15055b087894ed667432c02a4e26b8` |
| Result | pass=18 fail=0 |
| Token | `RC3_EPP_VALIDATION_OK` |

See [RC3_VALIDATION.md](./RC3_VALIDATION.md).
