# OpsEdge360 — Operations Manual

## Daily Operations

### Health Checks
- Grafana dashboards: platform overview, service SLOs
- `kubectl get pods -n trinetra360`
- Kafka consumer lag < 1000 messages

### Alert Response
| Alert | Action |
|-------|--------|
| API p95 > 500ms | Check HPA, DB connections |
| Kafka lag high | Scale consumers |
| Discovery failures | Check connector credentials |
| Neo4j sync delay | Restart graph-sync worker |

## Scaling

```bash
kubectl scale deployment cmdb -n trinetra360 --replicas=5
```

HPA configured for CPU > 70% on stateless services.

## Backup

| Component | Schedule | Retention |
|-----------|----------|-----------|
| PostgreSQL | Hourly WAL + daily snapshot | 30 days |
| Neo4j | Daily | 14 days |
| OpenSearch | Daily snapshot | 30 days |

## Disaster Recovery

- **RPO**: 15 minutes (WAL streaming)
- **RTO**: 1 hour (automated failover runbook)
- Quarterly DR drill documented in `runbooks/dr-failover.md`

## Log Management

- All services: JSON to stdout → Fluent Bit → OpenSearch
- Retention per tenant policy (default 30 days)

## Incident Management

1. PagerDuty alert → on-call acknowledges
2. RCA Agent auto-runs on P1 incidents
3. Post-incident: agent report + human review within 48h

## Maintenance Windows

- Rolling updates: zero-downtime via readiness probes
- DB migrations: blue-green with backward-compatible migrations
