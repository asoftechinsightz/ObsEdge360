# OpsEdge360 — Solution Architecture

**Version:** 1.0  
**Document ID:** TRN-SA-001

---

## 1. Solution Context

OpsEdge360 deploys as a modular platform where each bounded context is an independently deployable microservice communicating via REST APIs and Kafka events.

## 2. Service Topology

```
                    ┌─────────────────┐
                    │   apps/web      │
                    │   (Next.js)     │
                    └────────┬────────┘
                             │ HTTPS
                    ┌────────▼────────┐
                    │  api-gateway    │ :4000
                    │  (NestJS)       │
                    └────────┬────────┘
         ┌───────────────────┼───────────────────┐
         │                   │                   │
┌────────▼────────┐ ┌────────▼────────┐ ┌────────▼────────┐
│ discovery :4001 │ │   cmdb :4002    │ │ observability   │
│                 │ │                 │ │     :4003       │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Kafka Cluster  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  ai-agents      │ :5000
                    │  (Python/FastAPI)│
                    └─────────────────┘
```

## 3. Data Flow: Asset Discovery

```
Connector → discovery-service → Kafka(asset.discovered)
    → cmdb-service (upsert CI) → Neo4j (graph edge)
    → Kafka(cmdb.updated) → ai-agents (enrich, score)
    → WebSocket → web (digital twin update)
```

## 4. Data Flow: Business Transaction

```
OTLP Trace → observability-service → OpenSearch
    → transaction-service (classify, map)
    → cmdb-service (link CIs) → executive API (revenue at risk)
```

## 5. Data Flow: Compliance Check

```
Scheduler → compliance-service → query cmdb + observability
    → evaluate controls → PostgreSQL (evidence)
    → Kafka(compliance.violation) → ai-agents (remediation proposal)
```

## 6. Cross-Cutting Concerns

### Authentication
- API Gateway validates JWT from OIDC provider
- Service-to-service: mTLS + service account tokens

### Multi-Tenancy
- `tenant_id` on all records and Kafka message headers
- Row-level security in PostgreSQL
- Tenant-scoped Neo4j databases or label filtering

### Caching
- Redis for session, API response cache, rate limit counters
- TTL-based invalidation on CMDB events

### Resilience
- Circuit breakers (opossum) on external connectors
- Retry with exponential backoff on Kafka consumers
- Dead letter queues for failed events

## 7. Environment Topology

| Environment | Purpose | Infrastructure |
|-------------|---------|----------------|
| dev | Local development | Docker Compose |
| staging | Integration testing | K8s (single cluster) |
| prod | Production | K8s (multi-AZ, HA) |

## 8. Network Zones

| Zone | Components | Access |
|------|------------|--------|
| DMZ | API Gateway, Web | Public HTTPS |
| App | Microservices, AI agents | Internal only |
| Data | PostgreSQL, Neo4j, Kafka | App zone only |
| OT Edge | OT collectors (read-only) | One-way to app zone |

## 9. Solution Components (This Repo)

| Component | Path | Port |
|-----------|------|------|
| Web UI | `apps/web` | 3000 |
| API Gateway | `apps/api-gateway` | 4000 |
| Discovery | `services/discovery` | 4001 |
| CMDB | `services/cmdb` | 4002 |
| Observability | `services/observability` | 4003 |
| Compliance | `services/compliance` | 4004 |
| AI Agents | `ai-agents` | 5000 |
