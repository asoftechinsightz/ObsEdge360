# Security Assessment — RC1

## Controls

- AuthN: JWT, SSO OIDC/SAML, LDAP/AD connectors
- AuthZ: RBAC + ABAC + tenant isolation
- MFA: tenant policy (`off|optional|required`) + factor enrollment
- Secrets: encrypted store + rotation jobs (auto-rotate gated)
- Audit: dual-layer + governance audit
- Headers: nosniff, DENY frame, referrer, permissions-policy, HSTS (prod)
- API tokens: hashed at rest, revoke support
- Demo outbound kill-switch when `APP_ENV=demo|uat`

## OWASP Top 10

See live `GET /api/v1/security/assessment` for attested notes. Most items mitigated; SSRF and dependency vulns remain monitored.

## Zero Trust readiness

Service JWT, SPIFFE/mTLS path to CMDB, least-privilege permissions, tenant boundary enforcement.
