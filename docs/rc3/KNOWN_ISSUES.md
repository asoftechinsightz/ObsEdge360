# Known Issues — RC3

| ID | Issue | Notes |
|----|-------|-------|
| KI-01 | Helm gateway/web only | Compose remains full stack |
| KI-02 | Perf large-scale is Wave7-gated | Not RC3-certified soak |
| KI-03 | RBA not auto step-up | Framework scores only |
| KI-04 | Tokens without `jti` (pre-RC3) | Still valid until expiry unless `JWT_REQUIRE_SESSION=true` |

Closed from RC2: plaintext TOTP; revoke-without-JWT-kill.
