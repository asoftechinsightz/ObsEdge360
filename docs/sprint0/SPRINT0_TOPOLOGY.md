# Sprint 0 Topology Engine

## Map Types

| Type | CI Filter |
|------|-----------|
| application | application, api, service, database |
| infrastructure | server, vm, container, pod, network_device, firewall, load_balancer |
| cloud | cloud_resource, vm |
| network | network_device, firewall, router, switch |
| business-service | service, application |

## Features

- **Auto Layout** — Graph construction from CMDB relationships
- **Incremental Refresh** — Rebuild from current CI state
- **Versioned Topology** — `topology_snapshots` with monotonic version
- **Application Dependency Maps** — Via relationship edges
- **Infrastructure/Cloud/Network Maps** — Type-filtered subgraphs
- **Business Service Maps** — Service-to-component relationships

## API

```
GET  /cmdb/topology/:type
POST /cmdb/topology/:type/refresh
```

## Graph Model

```json
{
  "nodes": [{ "id": "uuid", "label": "name", "type": "server", "healthScore": 95, "riskScore": 10 }],
  "edges": [{ "source": "uuid", "target": "uuid", "type": "depends_on" }]
}
```

## Integration

Topology refresh can be scheduled via enterprise scheduler (`cmdb.drift-check`, custom topology refresh jobs).

Existing digital twin endpoints (`/twin/graph`, `/twin/impact`, `/twin/blast-radius`) remain unchanged for backward compatibility.
