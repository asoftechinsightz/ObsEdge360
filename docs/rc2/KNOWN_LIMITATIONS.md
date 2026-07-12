# Known Limitations — RC2 Pilot

1. **JWT revoke is inventory-level** — Revoking a session does not immediately invalidate bearer JWTs; tokens expire per `JWT_EXPIRES_IN` (default 24h). Prefer shorter TTL for sensitive pilots.  
2. **TOTP secrets are not encrypted at rest** — Column `secret_enc` stores the Base32 secret; protect database access.  
3. **Risk-based authentication is framework-only** — Risk scores are recorded; automatic step-up is not enforced.  
4. **Browser synthetics are simulated** — Not a full Chromium worker (audit A-08).  
5. **Helm chart is gateway/web-centric** — Full microservice parity remains Compose-first (audit A-12).  
6. **Performance profiles in RC2 are modeled** — Live multi-thousand-user soak is Wave7 `CERT_FULL_SCALE` on staging.  
7. **PDF executive reports** — CSV/JSON available; native PDF deferred.  
8. **i18n** — English-only UI strings.  
9. **Lab MFA codes** — Disabled by default; enabling `OPS_MFA_LAB_CODES=1` weakens MFA and is unsupported for customer pilots.  
10. **Historical DB name** — `trinetra360` remains a production alias; product brand is OpsEdge360.
