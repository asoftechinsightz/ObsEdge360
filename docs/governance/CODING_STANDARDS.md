# Enterprise Coding Standards

**Document ID:** OE360-CODE-001  
**Status:** FROZEN  
**Effective:** 2026-07-10  
**Stack:** TypeScript · NestJS (services/gateway) · Next.js (web) · PostgreSQL · Docker  

---

## 1. Naming conventions

| Area | Convention | Example |
|------|------------|---------|
| Packages / apps | kebab-case | `api-gateway`, `shared-db` |
| TypeScript files | kebab-case | `cmdb-proxy.controller.ts` |
| React components | PascalCase file OK for components | `LoginForm.tsx` |
| Classes / types / interfaces | PascalCase | `AuthService`, `CiRecord` |
| Functions / variables | camelCase | `getTopology`, `tenantId` |
| Constants | UPPER_SNAKE or const camel | `JWT_SECRET`, `defaultPageSize` |
| Env vars | UPPER_SNAKE | `DATABASE_URL`, `OE360_*` |
| DB tables / columns | snake_case | `ci_relationships`, `created_at` |
| HTTP paths | kebab or resource nouns under `/api/v1/` | `/api/v1/cmdb/topology/:type` |
| Migrations | numbered prefix | `015_*.sql` — never renumber 001–014 |
| Cookies / headers | established contracts | `oe360_token`, `X-Agent-Key`, `X-Tenant-Id` |

Do not invent parallel public API path styles without an ADR.

---

## 2. Folder structure

```text
apps/           # Deployable applications (api-gateway, web, …)
services/       # Domain microservices (discovery, cmdb, …)
packages/       # Shared libraries (shared-db, shared-security, …)
database/       # Migrations and runners
openapi/        # API contracts
docs/           # Governance, ADRs, phase docs, ops
infra/ / deploy # Compose, nginx, helm (as present)
```

- New production services require EAB + ADR before adding to prod compose.  
- Experimental services stay out of `docker-compose.prod.yml` until accepted (see ADR-003).  
- Prefer extending existing packages over duplicating auth/DB helpers.

---

## 3. API standards

1. Public HTTP API versioned under `/api/v1/` via gateway.  
2. New/changed routes: OpenAPI update in the same change set.  
3. Auth: JWT Bearer (user) unless `@Public` + documented alternate (e.g. `X-Agent-Key`).  
4. Errors: consistent HTTP status; structured JSON body (`statusCode`, `message`, optional `code`).  
5. Idempotent GETs; mutating methods require authz (Phase 2 enforcement).  
6. Health surfaces: `/health`, `/ready`, `/live`, `/version`, `/metrics` (or shared `mountOpsEndpoints`).  
7. Backward compatible by default; breaking changes need versioning + EAB approval.  

---

## 4. Error handling

- Prefer typed Nest/HTTP exceptions over raw `throw new Error` at controllers.  
- Never leak stack traces, SQL, or secrets to clients in production.  
- Log full error server-side with correlation/request id when available.  
- Map upstream proxy failures to appropriate 502/503/504 without exposing internal URLs unnecessarily.  
- Validate input at the boundary (DTO/pipes or schema).  

---

## 5. Logging standards

- Structured logs preferred (level, service, message, requestId, tenantId when safe).  
- Levels: `error` / `warn` / `info` / `debug` — no `debug` secrets in prod.  
- **Never** log passwords, JWT, API keys, connection strings, or raw PII beyond policy.  
- Gateway and services should remain greppable for incident response.  

---

## 6. Security practices

- No secrets in git; use env / future secrets manager (ADR-014).  
- Production locks: domains, DB name, Nginx/SSL, volumes, migrations 001–014.  
- Least privilege: do not widen `@Public` without ADR.  
- Dependency CVEs: Trivy CRITICAL fails CI (ADR-007).  
- Tenant context: treat as untrusted until Phase 2 isolation is enforced.  
- XSS/CSRF: follow ADR-008 for session cookie evolution.  
- OWASP Top 10 considered for every security-sensitive change.  

---

## 7. Testing standards

| Layer | Expectation |
|-------|-------------|
| Unit | Required for business logic and auth-sensitive helpers |
| Integration | Required for gateway wiring and DB-touching paths when feasible |
| API | Contract/smoke for new routes |
| Regression | Existing suites must stay green |
| Security | Auth positive/negative cases for new protected surfaces |

Tests live with packages/apps; CI must pass before merge to release branches.

---

## 8. Performance guidelines

- Avoid N+1 queries; paginate list endpoints.  
- Set timeouts on outbound HTTP/proxy calls.  
- Do not block event loop with heavy sync work; offload as needed.  
- Cache only with explicit TTL and invalidation story.  
- Record p95 targets in phase PRR / performance review.  
- Startup: services should become ready without manual intervention.  

---

## 9. Database standards

- Additive migrations only for production schema evolution.  
- Never edit applied historical migrations.  
- Name indexes and constraints explicitly.  
- Document rollback or expand/contract strategy in the migration PR.  

---

## 10. Related

- `DEFINITION_OF_DONE.md` · `DEFINITION_OF_READY.md` · `EXECUTIVE_ARCHITECTURE_BOARD.md`  
