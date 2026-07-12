# OpsEdge360 — API Review

**Assessment date:** 2026-07-12  
**Base path:** `/api/v1`  
**Docs:** Swagger `/api/docs`, OpenAPI `/api/docs-json`, `/api/v1/openapi.json`  
**Gateway:** `apps/api-gateway` (NestJS)

---

## Style & conventions

| Convention | Status |
|------------|--------|
| Global prefix `/api/v1` | Consistent |
| Bearer JWT | Default |
| `@Public()` allowlist | Health, auth, some agent enroll |
| `@RequirePermission` | Used heavily on admin/wave routes |
| Tenant via JWT + `X-Tenant-ID` downstream | Consistent |
| Proxy to microservices | Dominant pattern for domain APIs |
| Error shape | Nest HTTP exceptions; some Express variance |

---

## Surface inventory (gateway)

| Area | Prefix | Maturity |
|------|--------|----------|
| Health | `/health`, `/ready`, `/live`, `/version`, `/metrics` | C |
| Auth / SSO | `/auth`, `/auth/sso` | C |
| Executive | `/executive` | C |
| CMDB / Discovery / Twin | `/cmdb`, `/discovery`, `/twin` | C |
| Observability / Network | `/observability`, `/network` | C |
| Transactions | `/transactions` | C |
| Security / Compliance | `/security`, `/compliance` | C–P |
| AI / Copilot / Ops Intel | `/ai`, `/copilot`, `/ops-intelligence`, `/agents` | C |
| Automation | `/automation` | C (use `/automation/dashboard`, not bare `/automation`) |
| Integrations | `/integrations` | C |
| Admin platform | `/admin/*` | C |
| Wave 6–9 | `/admin/ops-health`, `/admin/system/{security,certification,release-candidate,ga}` | C |
| Dashboards | `/dashboards` | P |
| Secrets / Trust / Audit | `/secrets`, `/trust`, `/audit` | C |
| Analytics / Quantum / Governance / Sustainability | respective prefixes | P |

---

## Strengths

- Single BFF reduces CORS and AuthZ scatter  
- Wave controllers keep enterprise packaging APIs explicit  
- OpenAPI exported in RC/GA packaging scripts  
- Permission inference + explicit permissions on sensitive mutations  
- GA regression script documents live probe contracts  

---

## Issues

| Issue | Severity | Fix direction |
|-------|----------|---------------|
| Some clients probe non-existent collection roots (`GET /automation`) | Medium | Document canonical paths; keep aliases only if intentional |
| Microservice error formats differ | Low | Normalize in proxy |
| Public agent enroll endpoints | Medium | Continuous threat review |
| OpenAPI completeness vs all Express routes | Medium | Generate or manually extend for critical paths |
| Versioning | Low | Still `v1`; breaking changes forbidden — additive only |
| Rate limits not universal | Medium | Expand beyond auth |
| Idempotency keys | Low | Add for ITSM/ticket create when implemented |

---

## Compatibility policy (mandatory)

1. **Additive only** for existing `/api/v1` contracts  
2. Deprecate with sunset headers before removal  
3. New major modules → new subpaths, not overloads that change semantics  
4. Demo APIs must be clearly namespaced or gated (`X-OpsEdge-Env: demo`)  

---

## Validation evidence

- Wave validators + `wave9-ga-regression.mjs` exercise live production APIs  
- Unit tests cover AuthZ helpers and admin helpers  
- Gap: no contract test suite in CI for full OpenAPI diff  

**Recommendation:** Add CI job: build OpenAPI → spectral/lint → diff against frozen Wave8/GA snapshot for breaking changes.
