# OpsEdge360 — CMDB Data Model

**Version:** 1.0

---

## 1. Configuration Item (CI)

### Core Attributes

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Multi-tenant isolation |
| external_id | VARCHAR | Source system identifier |
| name | VARCHAR | Display name |
| ci_type | ENUM | server, vm, container, database, application, service, network_device, ot_device, cloud_resource, api, user, location |
| status | ENUM | discovered, active, maintenance, decommissioned |
| health_score | INT | 0-100 |
| compliance_score | INT | 0-100 |
| risk_score | INT | 0-100 |
| ai_confidence_score | INT | 0-100 discovery confidence |
| owner_id | UUID | FK to users |
| location_id | UUID | FK to location CI |
| attributes | JSONB | Type-specific attributes |
| tags | TEXT[] | Searchable tags |
| discovered_at | TIMESTAMPTZ | First discovery |
| last_seen_at | TIMESTAMPTZ | Last heartbeat/scan |
| created_at | TIMESTAMPTZ | Record creation |
| updated_at | TIMESTAMPTZ | Last update |

### Type-Specific Attributes (JSONB examples)

**server**: `{ "os": "RHEL 9", "cpu_cores": 16, "memory_gb": 64, "ip": "10.0.1.5" }`  
**cloud_resource**: `{ "provider": "aws", "region": "ap-south-1", "instance_type": "m5.xlarge" }`  
**ot_device**: `{ "protocol": "opc-ua", "vendor": "Siemens", "safety_zone": "production" }`

## 2. Relationship

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant |
| source_ci_id | UUID | FK configuration_items |
| target_ci_id | UUID | FK configuration_items |
| relationship_type | ENUM | depends_on, runs_on, connects_to, owned_by, part_of, secures, monitors, calls |
| strength | ENUM | weak, normal, critical |
| discovered_by | ENUM | agent, manual, inferred |
| ai_confidence_score | INT | 0-100 |
| metadata | JSONB | Additional context |
| valid_from | TIMESTAMPTZ | Relationship start |
| valid_to | TIMESTAMPTZ | Null if active |

## 3. Business Service

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant |
| name | VARCHAR | e.g. "UPI Payments" |
| tier | INT | 1=critical, 2=important, 3=standard |
| sla_target | DECIMAL | e.g. 99.95 |
| revenue_per_hour | DECIMAL | For revenue-at-risk calc |
| owner_id | UUID | Business owner |

## 4. Service Map

Links business services to root CIs (entry points):

| service_id | ci_id | role |
|------------|-------|------|
| uuid | uuid | entry_point / dependency |

## 5. Change Record

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| ci_id | UUID | Affected CI |
| change_type | ENUM | created, updated, deleted, relationship_added |
| before_state | JSONB | Snapshot before |
| after_state | JSONB | Snapshot after |
| changed_by | VARCHAR | user_id or agent_id |
| changed_at | TIMESTAMPTZ | Timestamp |

## 6. Neo4j Graph Mapping

```
(:ConfigurationItem {ci_id, tenant_id, name, ci_type, health_score})
  -[:DEPENDS_ON {strength, confidence}]-> (:ConfigurationItem)
  -[:PART_OF]-> (:BusinessService {name, tier, sla_target})
```

## 7. Event Payloads (Kafka)

### asset.discovered
```json
{
  "event_type": "asset.discovered",
  "tenant_id": "uuid",
  "timestamp": "ISO8601",
  "payload": {
    "external_id": "i-0abc123",
    "name": "web-server-01",
    "ci_type": "vm",
    "source_connector": "aws",
    "attributes": {},
    "ai_confidence_score": 95
  }
}
```

### cmdb.updated
```json
{
  "event_type": "cmdb.updated",
  "tenant_id": "uuid",
  "ci_id": "uuid",
  "change_type": "updated",
  "affected_fields": ["health_score"]
}
```

## 8. Indexes

- `configuration_items(tenant_id, ci_type)`
- `configuration_items(tenant_id, name)` GIN trigram
- `relationships(tenant_id, source_ci_id)`
- `relationships(tenant_id, target_ci_id)`
- `change_records(ci_id, changed_at DESC)`
