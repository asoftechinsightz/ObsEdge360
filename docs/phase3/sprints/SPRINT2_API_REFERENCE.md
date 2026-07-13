# Sprint 2 — API Reference (Unified Observability)

**Base path:** `/api/v1/observe`  
**Auth:** Bearer JWT  
**RBAC:** `observability:read` (GET) · `observability:write` (POST)  
**Brand:** Responses are OpsEdge360-canonical. Engine names are never returned to clients.

## Overview

### `GET /observe/overview`

Unified operating picture: domain cards, telemetry counts, narrative, AI prompts.

## Inventory domains

| Method | Path | Description |
|--------|------|-------------|
| GET | `/observe/applications` | Application inventory + health |
| GET | `/observe/infrastructure` | Servers, VMs, cloud instances |
| GET | `/observe/kubernetes` | Clusters, namespaces, workloads |
| GET | `/observe/containers` | Container inventory |
| GET | `/observe/databases` | Database health / performance |

**Response shape:**

```json
{
  "brand": "OpsEdge360",
  "domain": "applications",
  "asOf": "ISO-8601",
  "count": 4,
  "items": [
    {
      "id": "…",
      "name": "UPI Payments Fabric",
      "kind": "application",
      "health": "degraded",
      "healthScore": 78,
      "twinHref": "/twin?workflow=impact&focus=…",
      "observeHref": "/observability/applications?focus=…",
      "businessImpact": "…",
      "source": "live|demo"
    }
  ]
}
```

## Telemetry explorers

### `GET /observe/logs`

Query: `q`, `severity`, `service`, `hours`, `limit`

### `GET /observe/metrics`

Query: `service`, `category` (`infrastructure`\|`application`\|`business`), `hours`, `limit`

### `GET /observe/traces`

Query: `hours`, `limit` → `{ items: TraceSummary[] }`

### `GET /observe/traces/:traceId`

Span waterfall detail.

### `GET /observe/topology`

Dependency graph with health + `twinHref` per node.

## AI

### `POST /observe/ai/explain`

Body: `{ kind, id?, name?, prompt? }`  
Returns summary, evidence, confidence, business impact, affected services, root cause, remediation, automation recommendations.

## Demo

### `POST /observe/demo/seed`

Loads Banking360 / Retail360 / Cloud Native / Kubernetes / Hybrid Infrastructure telemetry into `otlp_*` + `host_metrics`.  
Also invoked automatically on EDE `enter` / `load` / `reset` / `provision`.

## Legacy (unchanged)

Existing `/api/v1/observability/*` (OTLP ingest, APM, hosts, scrape) remains for collectors and internal tools. Product UI prefers `/observe/*`.
