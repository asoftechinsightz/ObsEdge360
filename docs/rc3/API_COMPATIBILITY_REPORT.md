# API Compatibility Report — RC3

**Policy:** Additive only.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/rc3` | Readiness overview |
| PUT | `/rc3/approve` | Token `RC3_EPP_VALIDATION_OK` |
| GET | `/rc3/security` | Encryption / session posture |
| GET | `/pilot/toolkit` | EPP doc index |

Auth behavior change (compatible for clients that already handle 401):

- Access tokens include `jti` / optional `sid`  
- Revoked sessions → `401 Session revoked`  
- MFA secrets encrypted; enroll response still returns plaintext **once** for authenticator setup  

RC1/RC2 routes unchanged.
