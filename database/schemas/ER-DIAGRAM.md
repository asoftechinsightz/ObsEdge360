# OpsEdge360 — ER Diagram

```mermaid
erDiagram
    TENANT ||--o{ USER : has
    TENANT ||--o{ CONFIGURATION_ITEM : owns
    TENANT ||--o{ DISCOVERY_CONNECTOR : configures
    TENANT ||--o{ BUSINESS_SERVICE : defines
    TENANT ||--o{ COMPLIANCE_FRAMEWORK : adopts

    USER ||--o{ CONFIGURATION_ITEM : owns
    CONFIGURATION_ITEM ||--o{ RELATIONSHIP : source
    CONFIGURATION_ITEM ||--o{ RELATIONSHIP : target
    CONFIGURATION_ITEM ||--o{ CHANGE_RECORD : history
    CONFIGURATION_ITEM ||--o{ COMPLIANCE_EVIDENCE : evidences

    BUSINESS_SERVICE ||--o{ SERVICE_MAP : maps
    CONFIGURATION_ITEM ||--o{ SERVICE_MAP : entry_point

    BUSINESS_SERVICE ||--o{ BUSINESS_TRANSACTION : contains
    BUSINESS_TRANSACTION ||--o{ TRANSACTION_STEP : steps
    CONFIGURATION_ITEM ||--o{ TRANSACTION_STEP : participates

    COMPLIANCE_FRAMEWORK ||--o{ COMPLIANCE_CONTROL : contains
    COMPLIANCE_CONTROL ||--o{ COMPLIANCE_CHECK : validates
    COMPLIANCE_CONTROL ||--o{ COMPLIANCE_EVIDENCE : requires

    CONFIGURATION_ITEM ||--o{ ALERT : triggers
    CONFIGURATION_ITEM ||--o{ SUSTAINABILITY_METRIC : measures

    TENANT {
        uuid id PK
        string name
        string region
        jsonb settings
    }

    USER {
        uuid id PK
        uuid tenant_id FK
        string email
        string role
    }

    CONFIGURATION_ITEM {
        uuid id PK
        uuid tenant_id FK
        string name
        enum ci_type
        enum status
        int health_score
        int compliance_score
        int risk_score
        int ai_confidence_score
        jsonb attributes
    }

    RELATIONSHIP {
        uuid id PK
        uuid source_ci_id FK
        uuid target_ci_id FK
        enum relationship_type
        enum strength
    }

    BUSINESS_SERVICE {
        uuid id PK
        uuid tenant_id FK
        string name
        int tier
        decimal sla_target
        decimal revenue_per_hour
    }

    BUSINESS_TRANSACTION {
        uuid id PK
        uuid service_id FK
        string name
        string classification
    }

    COMPLIANCE_FRAMEWORK {
        uuid id PK
        string code
        string name
        string version
    }

    COMPLIANCE_CONTROL {
        uuid id PK
        uuid framework_id FK
        string control_id
        string title
        jsonb validation_query
    }

    ALERT {
        uuid id PK
        uuid ci_id FK
        string severity
        string title
        timestamp fired_at
    }

    SUSTAINABILITY_METRIC {
        uuid id PK
        uuid ci_id FK
        decimal energy_kwh
        decimal carbon_kg
        decimal pue
        timestamp recorded_at
    }
```

## Store Mapping

| Entity Group | Primary Store |
|--------------|---------------|
| Tenant, User, CI, Relationship, Compliance | PostgreSQL |
| Topology graph | Neo4j (synced from CI) |
| Events, raw telemetry | MongoDB |
| Logs, traces, search | OpenSearch |
| Sessions, cache | Redis |

See [DATABASE-DESIGN.md](./DATABASE-DESIGN.md) for full schema.
