# OpsEdge360 — Database Design

**Version:** 1.0

---

## 1. Polyglot Persistence Strategy

| Database | Use Case | Data |
|----------|----------|------|
| PostgreSQL | ACID, relational | CMDB, compliance, audit, users, transactions |
| MongoDB | Flexible documents | Raw discovery payloads, event archives |
| Neo4j | Graph traversal | Digital twin, dependency analysis |
| OpenSearch | Full-text, time-series | Logs, traces, fraud signals |
| Redis | In-memory | Cache, sessions, rate limits, pub/sub |
| Kafka | Event streaming | Domain events, agent triggers |

## 2. PostgreSQL Schema

Primary database: `trinetra360`

### Extensions
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### Core Tables
- `tenants` — multi-tenant root
- `users` — platform users with RBAC roles
- `configuration_items` — CMDB CIs
- `relationships` — CI graph edges
- `business_services` — business service definitions
- `service_maps` — service-to-CI mapping
- `change_records` — CMDB audit trail
- `discovery_connectors` — connector configurations
- `compliance_frameworks` — framework definitions
- `compliance_controls` — individual controls
- `compliance_checks` — check execution results
- `compliance_evidence` — evidence artifacts
- `business_transactions` — transaction definitions
- `transaction_steps` — transaction flow steps
- `alerts` — operational alerts
- `sustainability_metrics` — energy/carbon data
- `audit_log` — immutable platform audit
- `agent_runs` — AI agent execution history
- `remediation_approvals` — human-in-the-loop queue

See `database/migrations/001_initial.sql` for DDL.

## 3. MongoDB Collections

| Collection | Purpose |
|------------|---------|
| `discovery_scans` | Raw scan results before normalization |
| `telemetry_events` | High-volume event archive |
| `agent_conversations` | LLM conversation history |

## 4. Neo4j Graph

- One database per tenant (enterprise) or label-filtered (SaaS)
- Synced from PostgreSQL via graph-sync worker
- APOC procedures for impact analysis

## 5. OpenSearch Indices

| Index Pattern | Retention |
|---------------|-----------|
| `logs-{tenant}-{date}` | 30 days hot, 90 days warm |
| `traces-{tenant}-{date}` | 7 days |
| `metrics-{tenant}` | 90 days |
| `fraud-signals-{tenant}` | 365 days |

## 6. Partitioning & Scaling

- PostgreSQL: partition `change_records` and `audit_log` by month
- OpenSearch: index-per-tenant for isolation
- Kafka: topic per event type with tenant key partitioning

## 7. Backup Strategy

| Store | Method | Frequency |
|-------|--------|-----------|
| PostgreSQL | pg_dump + WAL streaming | Hourly + continuous |
| Neo4j | neo4j-admin backup | Daily |
| OpenSearch | snapshot to S3 | Daily |
| MongoDB | mongodump | Daily |

## 8. Data Retention

Configurable per tenant via `tenants.settings`:
```json
{
  "retention": {
    "logs_days": 30,
    "traces_days": 7,
    "cmdb_history_days": 365,
    "audit_days": 2555
  }
}
```
