# OpsEdge360 — Phase 1 Implementation

Phase 1 delivers a working foundation with real data persistence, event-driven discovery, and OTLP ingestion.

## What's Implemented

| Capability | Status | Details |
|------------|--------|---------|
| Universal Discovery Engine | ✅ | Static, Kubernetes, AWS connectors; plugin registry |
| Enterprise CMDB | ✅ | PostgreSQL persistence, relationships, change history |
| Digital Twin (graph) | ✅ | Neo4j sync on CI upsert; graph API |
| Event Bus | ✅ | Kafka (optional); HTTP fallback when `KAFKA_ENABLED=false` |
| API Gateway | ✅ | JWT auth, multi-tenant headers, service proxy |
| OpenTelemetry Ingestion | ✅ | `/v1/metrics`, `/v1/logs`, `/v1/traces` (JSON) |
| Executive Dashboard | ✅ | Live KPIs from CMDB stats |
| Multi-Tenancy | ✅ | `X-Tenant-ID` header + JWT `tenantId` claim |

## Quick Start

```powershell
cd D:\AsoftechInsightz_Project\OpsEdge360
copy .env.example .env

# Start data stores
docker compose up -d postgres redis neo4j

# Install & migrate
npm install
npm run db:migrate

# Start all services
npm run dev
```

In a second terminal (after services are up):
```powershell
npm run phase1:bootstrap
```

## Endpoints

| Service | URL |
|---------|-----|
| Web UI | http://localhost:3000 |
| API Gateway | http://localhost:4000 |
| Swagger | http://localhost:4000/api/docs |
| CMDB (direct) | http://localhost:4002 |
| Discovery (direct) | http://localhost:4001 |
| Observability OTLP | http://localhost:4003/v1/metrics |

## Auth (Phase 1)

```http
POST /api/v1/auth/login
{ "email": "admin@trinetra360.local", "password": "any" }
```

Set `AUTH_REQUIRED=false` in `.env` for open API access during development.

## Discovery Flow

```
POST /api/v1/discovery/scan
  → Discovery connectors run (static, k8s, aws)
  → asset.discovered events (Kafka or HTTP → CMDB /internal/ingest)
  → CMDB upserts CIs in PostgreSQL
  → Neo4j graph sync
  → cmdb.updated / twin.updated events
```

## OTLP Ingestion Example

```http
POST /api/v1/observability/otlp/logs
Content-Type: application/json

{
  "logs": [
    { "body": "payment-db-primary connection pool warning", "severity": "ERROR" }
  ]
}
```

Then sync health scores:
```http
POST /api/v1/observability/health-score/sync
```

## Phase 2 Preview

- Real AWS/K8s SDK connectors
- Kafka always-on in production
- Business transaction classifier
- Compliance control validation engine
- AI agent Kafka consumers
