# Integration Architecture v1.0

**Document ID:** OE360-INT-1.0  
**Version:** 1.0  
**Status:** FROZEN  
**Effective:** 2026-07-10  

---

## 1. North-south integrations

| Integration | Pattern |
|-------------|---------|
| Browser ↔ API | HTTPS JSON via gateway `/api/v1` |
| Agents ↔ API | HTTPS + `X-Agent-Key` on designated routes |
| TLS edge | Nginx terminates; proxies to web/gateway |

## 2. East-west integrations

| Integration | Pattern |
|-------------|---------|
| Gateway ↔ services | HTTP proxy on Docker network |
| Services ↔ PostgreSQL | Connection via shared-db / env URL |
| Services ↔ Redis | Cache/session (as configured) |
| Services ↔ Kafka | Events via `@opsedge360/event-bus` patterns |

## 3. API contract

- OpenAPI under `openapi/` + Nest Swagger where enabled  
- Additive versioning; breaking changes need EAB/ADR  
- New routes require OpenAPI update (DoD)

## 4. Eventing (baseline)

- Kafka topics for async domain events where adopted  
- Not all flows are event-driven yet; request/response remains primary for Phase 1 surfaces  

## 5. Pack / plugin integrations (target)

- Packs contribute rules, UI, connectors via frameworks (ADR-020/024/025)  
- No pack may bypass gateway authz  

## 6. External systems (roadmap)

SSO/OIDC, SIEM export, Vault, cloud provider APIs — introduced via ADRs without editing this freeze; publish `INTEGRATION_ARCHITECTURE_v1.1.md` when material.
