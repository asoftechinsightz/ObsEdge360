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

## New Endpoints

### Agent Framework

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/discovery/agents/:id/config` | X-Agent-Key | Pull agent configuration |
| PUT | `/discovery/agents/:id/config` | X-Agent-Key | Push agent configuration |
| GET | `/discovery/agents/:id/updates` | X-Agent-Key | Check for agent updates |

### Discovery v2 Protocols

`GET /discovery/protocols` now includes: `rest`, `winrm`, `wmi`, `vmware`, `network`, `dependency`, `business-service`

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

### Scheduler

| Method | Path | Description |
|--------|------|-------------|
| GET | `/scheduler/jobs` | List scheduled jobs |
| POST | `/scheduler/jobs` | Create job |
| GET | `/scheduler/dead-letter` | List dead letter queue |

### Config Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/config-management/templates` | List templates |
| POST | `/config-management/templates` | Create template |
| POST | `/config-management/deploy` | Deploy rendered config |
| POST | `/config-management/deployments/:id/rollback` | Rollback deployment |

## Health Endpoints (all services)

- `GET /health` — liveness
- `GET /ready` — readiness (scheduler, config-management, observability)
- `GET /live` — process alive
- `GET /metrics` — Prometheus text exposition

## Pagination / Filtering

Existing CMDB and discovery list endpoints support `search`, `ciType`, `page`, `pageSize` query parameters. Sprint 0 maintains backward compatibility.
