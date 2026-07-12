# Release Notes — OpsEdge360 RC2 (`v1.0.0-rc2-pilot`)

## Highlights

- Production RFC 6238 TOTP MFA with hashed backup codes  
- MFA enforced at login when tenant policy is `required`  
- Lab MFA challenge codes gated (`OPS_MFA_LAB_CODES`, default off)  
- Security Center UX for sessions, login history, alerts, rotation  
- Demo reset + executive walkthrough (incl. incident talk-track)  
- Modeled capacity profiles (100–10k) with honest Wave7 linkage  
- Customer pilot documentation package under `docs/rc2/`  

## Compatibility

- Additive APIs and migrations 045/046  
- Rollback app to RC1 SHA `ac6c6ba` without reversing DB  

## Security residuals (disclosed)

- Session revoke does not immediately invalidate JWTs  
- TOTP secrets not encrypted at rest  
- RBA framework-only  

## Validation

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| SHA | `a2d7e44ec25dbd2eb9ae11255282d6b60f086f6f` |
| Result | pass=31 fail=0 |
| Token | `RC2_PILOT_VALIDATION_OK` |

See [RC2_VALIDATION.md](./RC2_VALIDATION.md).
