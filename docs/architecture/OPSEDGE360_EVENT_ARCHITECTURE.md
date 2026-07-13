# OpsEdge360 — Event Architecture

**Document ID:** OE360-EVT-P1-001  
**Phase:** 1

---

## 1. Purpose

An enterprise event bus lets modules communicate asynchronously without tight coupling. Every significant state change emits a **canonical domain event**.

---

## 2. Bus technology

- Primary: Apache Kafka (or managed equivalent)  
- Dev/lite profiles may use Redis streams — **same envelope**  
- Tenant partition key: `tenantId`  
- Ordering key: entity id where required  

---

## 3. Event envelope

```json
{
  "id": "uuid",
  "type": "incident.created",
  "specVersion": "1.0",
  "time": "ISO-8601",
  "tenantId": "uuid",
  "source": "ops-intelligence",
  "subject": "incident/uuid",
  "correlationId": "uuid",
  "causationId": "uuid",
  "actor": { "type": "user|system|ai", "id": "..." },
  "data": {},
  "dataContentType": "application/json"
}
```

Aligns with CloudEvents-inspired fields.

---

## 4. Core event catalog

| Event type | Producers | Consumers |
|------------|-----------|-----------|
| `alert.created` | Observe/Security adapters | Correlation, Incident |
| `alert.correlated` | Ops Intelligence | Twin overlay, UI |
| `incident.created` | Ops Intelligence | Notify, Twin, AI, Reports |
| `incident.updated` | Ops Intelligence | UI, Audit |
| `incident.resolved` | Ops Intelligence | Reports, Automation verify |
| `service.down` / `service.degraded` | Observe/Twin | Incident, Exec dash |
| `deployment.completed` | CI plugin / Change | Observe markers, RCA |
| `threat.detected` | Security adapter | Security WS, Incident |
| `configuration.changed` | CMDB / Drift | Twin, Compliance |
| `automation.started` | Automation | Audit, UI |
| `automation.completed` | Automation | Incident verify, Reports |
| `ai.recommendation.generated` | AI plane | Workspace, Audit |
| `finding.opened` / `finding.closed` | Security | Twin, Compliance |
| `ci.upserted` | CMDB / Discovery | Twin projector |
| `relationship.changed` | CMDB | Twin projector |
| `report.generated` | Reporting | Notify |
| `audit.recorded` | Platform | SIEM export plugin |

---

## 5. Delivery semantics

| Class | Semantics |
|-------|-----------|
| Notifications | At-least-once |
| Twin projection | At-least-once + idempotent upsert |
| Audit | At-least-once; sink is append-only |
| Customer webhooks | At-least-once with signed retries |

Consumers must be **idempotent**.

---

## 6. Module communication pattern

Prefer:

1. Command via API (sync) for user actions  
2. Event for fan-out side effects  

Avoid chatty sync cycles between domain services for state propagation.

---

## 7. Observability of the bus

- Lag metrics per consumer group  
- Dead-letter topics + admin replay  
- Schema registry for event payloads  

---

## 8. Security

- ACLs per service principal  
- No PII in event type names; minimize PII in `data`  
- Encryption in transit; at-rest per platform standard  
