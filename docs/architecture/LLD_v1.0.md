# Low-Level Design (LLD) v1.0

**Document ID:** OE360-LLD-1.0  
**Version:** 1.0  
**Status:** FROZEN  
**Effective:** 2026-07-10  

LLD v1.0 records **implementation-level conventions** as of Phase 1. Component deep-dives for Phase 2+ are added via new versioned LLD sections or ADRs — not by rewriting this freeze.

---

## 1. Repository layout

| Path | Role |
|------|------|
| `apps/api-gateway` | NestJS BFF/API gateway |
| `apps/web` | Next.js console |
| `services/*` | Domain microservices |
| `packages/*` | Shared libraries |
| `database/migrations` | Numbered SQL migrations |
| `openapi/` | API contracts |
| `docker-compose*.yml` | Local/prod runtime |

## 2. Gateway conventions

- Controllers under `apps/api-gateway/src/*` proxy or implement `/api/v1/...`  
- Global JWT auth with `@Public()` exceptions  
- Health aggregation probes core dependencies  
- Phase 1 wired: CMDB topology, observability pipeline, discovery agent config/updates  

## 3. Service conventions

- NestJS (or service-local stack) exposing HTTP to gateway  
- Ops endpoints via `mountOpsEndpoints` / equivalent: health, ready, live, version, metrics  
- Config via environment variables  

## 4. Web conventions

- Next.js app router; middleware protects authenticated routes  
- Public: login, forgot/reset password paths  
- Pack flag: `NEXT_PUBLIC_PACK_BANKING360_ENABLED`  

## 5. Auth contracts (v1.0)

| Mechanism | Usage |
|-----------|--------|
| `Authorization: Bearer <jwt>` | User API calls |
| Cookie `oe360_token` | Present; HttpOnly hardening deferred (ADR-008) |
| `X-Agent-Key` | Agent config/updates |
| `X-Tenant-Id` | Tenant hint; not sole trust root after Phase 2 |

## 6. Error & logging

- HTTP JSON errors from Nest patterns  
- No secrets in logs  
- Prefer structured logs for new code  

## 7. Testing

- Unit tests colocated; CI runs workspace tests  
- Integration/staging evidence required at PRR  

## 8. Evolution

Phase 2 LLD details (policy engine modules, audit tables, session BFF) ship as `LLD_v1.1.md` or phase annexes after ADR acceptance.
