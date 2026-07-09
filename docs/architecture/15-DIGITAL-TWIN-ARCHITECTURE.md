# OpsEdge360 — Digital Twin Architecture

**Version:** 1.0

---

## 1. Definition

The Enterprise Digital Twin is a **live, graph-native representation** of the entire organization: business services, applications, infrastructure, network, OT, security controls, users, locations, and sustainability metrics — synchronized in real time from the CMDB and observability layers.

## 2. Graph Model (Neo4j)

### Node Labels
- `BusinessService`, `Application`, `API`, `Microservice`
- `Server`, `VM`, `Container`, `Pod`, `Database`, `Queue`, `Cache`
- `NetworkDevice`, `Firewall`, `LoadBalancer`, `Link`
- `OTDevice`, `PLC`, `Sensor`, `SCADA`
- `SecurityControl`, `User`, `Location`
- `CloudResource`, `SaaSApp`

### Relationship Types
- `DEPENDS_ON`, `RUNS_ON`, `CONNECTS_TO`, `ROUTES_TO`
- `SECURES`, `MONITORS`, `OWNED_BY`, `LOCATED_AT`
- `PART_OF`, `IMPLEMENTS`, `CALLS`

## 3. Sync Pipeline

```
CMDB Change (PostgreSQL)
    → Kafka (cmdb.updated)
    → Graph Sync Worker
    → Neo4j MERGE nodes/edges
    → Kafka (twin.updated)
    → WebSocket → Cytoscape.js UI
```

## 4. Node Properties

```json
{
  "ci_id": "uuid",
  "tenant_id": "uuid",
  "name": "payment-api",
  "type": "microservice",
  "health_score": 92,
  "risk_score": 15,
  "compliance_score": 88,
  "status": "active",
  "last_seen": "2026-07-02T10:00:00Z",
  "metadata": {}
}
```

## 5. Visualization (Frontend)

- **Library**: Cytoscape.js with fcose layout
- **Layers**: Toggle IT / OT / Network / Security / Business
- **Interactions**: Click node → CI detail panel; hover → health badge
- **Real-time**: WebSocket `twin.updated` triggers incremental graph patch

## 6. Query API

```
GET /api/v1/twin/graph?tenant_id=&layers=it,network&root_ci_id=
GET /api/v1/twin/impact/{ci_id}  — blast radius for failure
GET /api/v1/twin/path?from={ci_a}&to={ci_b}  — dependency path
```

## 7. Business Context Overlay

Business services rendered as top-level grouping nodes with aggregated:
- Availability %
- Transaction volume
- Revenue at risk
- SLA status

## 8. Sustainability Overlay

Datacenter/location nodes include:
- `energy_kwh`, `carbon_kg`, `pue`, `renewable_pct`

## 9. Performance

- Subgraph queries limited to 10K nodes (paginated expansion)
- Redis cache for frequently accessed topology views (TTL 60s)
- Incremental WebSocket updates (delta, not full graph)

## 10. OT Safety

OT nodes displayed with safety zone boundaries; active remediation blocked on OT subgraph without explicit OT engineer approval.
