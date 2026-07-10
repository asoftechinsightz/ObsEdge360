# Sprint 0 Security Foundation

## Controls Implemented

| Control | Implementation |
|---------|----------------|
| JWT Authentication | Existing gateway (unchanged) |
| RBAC | `roles`, `user_roles` tables; `@opsedge360/shared-security` |
| ABAC | `abac_policies` with resource/action patterns and conditions |
| API Keys | Scoped keys with SHA-256 hash, prefix lookup, expiry |
| Rate Limiting | Token bucket in `shared-security`; OTLP rate limit in observability |
| Audit Logs | `audit_logs` table + `writeAuditLog()` |
| Encryption | TLS in transit; secrets via environment variables only |
| Input Validation | Express body parsing with strict TypeScript types |
| SQL Injection | Parameterized queries via `pg` |
| Agent Auth | `X-Agent-Key` with bcrypt-style hash verification |
| Mutual TLS | Certificate manager in agent-framework; fingerprint storage |

## OWASP Top 10 Mitigations

1. **Broken Access Control** — RBAC + ABAC + tenant isolation
2. **Cryptographic Failures** — No hardcoded secrets; API key hashing
3. **Injection** — Parameterized SQL; no dynamic query concatenation
4. **Insecure Design** — Zero trust agent auth; fail-closed on invalid keys
5. **Security Misconfiguration** — Structured logging; no console.log in new code
6. **Vulnerable Components** — CI Trivy scan + SBOM generation
7. **Authentication Failures** — Existing JWT + new API key rotation support
8. **Software Integrity** — Agent update checksum verification
9. **Logging Failures** — Structured audit logs with correlation IDs
10. **SSRF** — Discovery connectors use explicit target configuration only

## Default Roles (seeded)

- `admin` — `["*"]`
- `operator` — discovery, cmdb read, observability, remediation
- `viewer` — `["*:read"]`

## Secrets Management

All credentials via environment variables:
- `POSTGRES_PASSWORD`, `JWT_SECRET`, `AGENT_LATEST_VERSION`
- Cloud connector credentials in connector config (encrypted at rest in future sprint)

## Token Rotation

API keys support `revoked_at` and `expires_at`. JWT rotation uses existing gateway auth module.

## Security Notes for Deployment

- Do not modify production Nginx SSL or volume names
- Apply migration 015 during maintenance window
- Enable `TLS_VERIFY=true` for all agents in production
