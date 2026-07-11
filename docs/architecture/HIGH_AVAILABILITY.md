# High Availability Architecture

**Wave:** Phase 5 / Wave 2 (`v1.0.0-wave2`)  
**Status:** Foundation ready — live multi-node is operator-enabled

```mermaid
flowchart TB
  lb[LoadBalancer_or_Nginx]
  gw1[API_Gateway_1]
  gw2[API_Gateway_2]
  svc[Stateless_Services]
  pgPrimary[PostgreSQL_Primary]
  pgReplica[PostgreSQL_Replica]
  redis[Redis_or_Sentinel]
  kafka[Kafka_Brokers]

  lb --> gw1
  lb --> gw2
  gw1 --> svc
  gw2 --> svc
  svc --> pgPrimary
  pgPrimary -.->|streaming| pgReplica
  svc --> redis
  svc --> kafka
```

## Patterns

| Component | Pattern |
|-----------|---------|
| API Gateway / Web / microservices | Active/Active horizontal scale |
| PostgreSQL | Active/Passive streaming replication |
| Redis | Standalone or Sentinel |
| Kafka | Multi-broker RF≥3 when clustered |

## Artifacts

- `docker-compose.ha.yml`
- `infra/helm/opsedge360` (+ `values-ha.yaml`)
- Admin probes: `GET /api/v1/admin/ha`

## Honesty

Current production VPS may remain single-node (`topologyMode=single_node_ha_ready`) while HA configs and APIs are validated. Set `HA_MULTI_NODE=true` when multi-replica is actually running.
