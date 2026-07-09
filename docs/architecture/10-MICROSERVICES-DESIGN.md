# OpsEdge360 — Microservices Design

**Version:** 1.0

---

## 1. Service Catalog

| Service | Responsibility | Database | Events |
|---------|----------------|----------|--------|
| api-gateway | Auth, routing, aggregation, WebSocket proxy | Redis | — |
| discovery | Connector orchestration, asset detection | MongoDB (raw scans) | Publishes `asset.*` |
| cmdb | CI CRUD, relationships, scoring | PostgreSQL, Neo4j | Consumes `asset.*`, publishes `cmdb.*` |
| observability | OTLP ingestion, dashboards data | OpenSearch, Prometheus | Publishes `alert.*` |
| compliance | Framework controls, evidence | PostgreSQL | Publishes `compliance.*` |
| transaction | Business flow mapping | PostgreSQL, OpenSearch | Consumes traces |
| security | Fraud, anomaly, SIEM bridge | OpenSearch | Publishes `security.*` |
| ai-agents | Autonomous intelligence | PostgreSQL, Redis | Consumes all, publishes `agent.*` |

## 2. Communication Patterns

### Synchronous (REST)
- Client → API Gateway → Service (request/response)
- Used for: CRUD, queries, dashboard data

### Asynchronous (Kafka)
- Service → Kafka → Service(s)
- Used for: discovery events, CMDB updates, alerts, agent triggers

### Real-Time (WebSocket)
- API Gateway → Web clients
- Used for: digital twin updates, live alerts

## 3. API Gateway Responsibilities

- JWT validation (OIDC)
- Tenant extraction from token claims
- Rate limiting (Redis)
- Request routing to backend services
- OpenAPI documentation aggregation
- WebSocket upgrade for real-time feeds

## 4. Discovery Service

### Connectors (Plugin Architecture)

```typescript
interface DiscoveryConnector {
  name: string;
  protocol: string;
  discover(config: ConnectorConfig): AsyncGenerator<DiscoveredAsset>;
  healthCheck(config: ConnectorConfig): Promise<boolean>;
}
```

### Supported Connectors (Phase 1)
- SSH, SNMP, Kubernetes API, AWS API
- Phase 2: WMI, Azure, GCP, NetFlow, OPC-UA

### Events Published
- `asset.discovered` — new asset found
- `asset.updated` — attribute change
- `asset.removed` — asset no longer reachable

## 5. CMDB Service

### Domain Model
- ConfigurationItem (entity)
- Relationship (entity)
- ServiceMap (aggregate)
- ChangeRecord (audit)

### Graph Sync
On every CI/relationship change, async job syncs to Neo4j for digital twin.

### Scoring Engine
Computes health, compliance, risk, AI confidence from observability and compliance data.

## 6. Observability Service

- OTLP HTTP/gRPC receiver
- NetFlow parser (Phase 2)
- Alert rule engine
- Integration with Prometheus (scrape targets from CMDB)

## 7. AI Agents Service

Python FastAPI + LangGraph:

| Agent | Trigger | Actions |
|-------|---------|---------|
| Discovery | `asset.discovered` | Enrich, classify, propose relationships |
| RCA | `alert.critical` | Correlate, hypothesize root cause |
| Remediation | `agent.remediation.approved` | Execute runbook |
| Compliance | `compliance.violation` | Propose fix, collect evidence |
| Fraud | `security.anomaly` | Score, explain, escalate |

## 8. Service Dependencies

```
api-gateway → all services (sync)
discovery → kafka → cmdb, ai-agents
cmdb → neo4j, kafka → web (ws), ai-agents
observability → opensearch, kafka → cmdb (health scores)
compliance → cmdb, observability
ai-agents → cmdb, observability (read), kafka (write)
```

## 9. Deployment Units

Each service = Docker image + Helm subchart:

```
infra/helm/trinetra360/
├── Chart.yaml
├── values.yaml
├── templates/
└── charts/
    ├── api-gateway/
    ├── discovery/
    ├── cmdb/
    ├── observability/
    ├── compliance/
    ├── ai-agents/
    └── web/
```

## 10. Versioning Strategy

- API: `/api/v1/`, `/api/v2/` with 12-month deprecation
- Events: Schema registry (Avro/JSON Schema) with backward compatibility
- Services: Independent semver, deployed via GitOps
