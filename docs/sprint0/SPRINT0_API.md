# Sprint 0 API Contract

**Base URL (production):** `https://api.observability360.asoftechinsightz.com/api/v1`  
**Version:** OpenAPI 3.1 (existing `openapi/trinetra360-v1.yaml` + Sprint 0 extensions)

## Response Standards

```json
{
  "data": {},
  "meta": { "page": 1, "pageSize": 50, "total": 100 },
  "correlationId": "uuid"
}
```

## Error Standards

```json
{
  "error": "Human-readable message",
  "code": "VALIDATION_ERROR",
  "statusCode": 400,
  "correlationId": "uuid"
}
```

## New Endpoints (Phase 1 — production path)

### Agent Framework

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/discovery/agents/:id/config` | X-Agent-Key | Pull agent configuration |
| PUT | `/discovery/agents/:id/config` | X-Agent-Key | Push agent configuration |
| GET | `/discovery/agents/:id/updates` | X-Agent-Key | Check for agent updates |

### Telemetry Pipeline

| Method | Path | Description |
|--------|------|-------------|
| GET | `/observability/pipeline/sources` | List telemetry sources |
| POST | `/observability/pipeline/sources` | Register source |
| POST | `/observability/pipeline/ingest/:sourceId` | Ingest normalized logs |

### Topology

| Method | Path | Description |
|--------|------|-------------|
| GET | `/cmdb/topology/:type` | Get latest topology snapshot |
| POST | `/cmdb/topology/:type/refresh` | Incremental topology refresh |

Types: `application`, `infrastructure`, `cloud`, `network`, `business-service`

### Scheduler & Config Management — NOT in production (ADR-003 Option B)

| Service | Status |
|---------|--------|
| `services/scheduler` (:4011) | **Experimental** — local/lab only; no gateway routes; not in `docker-compose.prod.yml` |
| `services/config-management` (:4012) | **Experimental** — local/lab only; no gateway routes; not in `docker-compose.prod.yml` |

Do not call `/scheduler/*` or `/config-management/*` on production API — those paths are not exposed.

## Health Endpoints (all production services + gateway)

- `GET /health` — liveness/health (gateway probes dependencies)
- `GET /ready` — readiness
- `GET /live` — process alive
- `GET /version` — version metadata
- `GET /metrics` — Prometheus text exposition

Gateway paths are under `/api/v1/*`.

## Pagination / Filtering

Existing CMDB and discovery list endpoints support `search`, `ciType`, `page`, `pageSize` query parameters. Sprint 0 maintains backward compatibility.
