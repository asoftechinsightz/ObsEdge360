<!-- Generated Phase 0 — 2026-07-06 — OpsEdge360 -->

# Security Review

## Implemented

- JWT bearer auth (HS256), signup/login, forgot/reset password
- SSO OIDC + SAML
- Auth rate limit (20/min/IP+email, in-memory)
- CORS allowlist, security headers, DTO validation
- Tenant isolation via JWT `tenantId` + query filters
- `audit_log` table

## Gaps

| Control | Target | Actual |
|---------|--------|--------|
| RBAC | Role guards on all routes | Admin-only on SSO CRUD |
| MFA | Admin MFA | Not implemented |
| JWT | RS256, short TTL | HS256, 24h default |
| mTLS | Service-to-service | Not implemented |
| RLS | Postgres policies | App-level only |
| WAF | Edge protection | Not deployed |
| Secrets | Vault/KMS | Environment variables |

**Maturity:** 4.5/10
