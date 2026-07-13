# OpsEdge360 — Enterprise Data Model

**Document ID:** OE360-DM-P1-001  
**Phase:** 1

Canonical entities are **OpsEdge360** owned. External systems map into these via adapters (`external_refs`).

---

## 1. Tenancy & identity

| Entity | Description |
|--------|-------------|
| **Organization** | Commercial customer / holding |
| **Tenant** | Isolation boundary (environment or BU) |
| **User** | Human identity |
| **ServiceAccount** | Machine identity |
| **Role** | Named permission set |
| **Permission** | Atomic authz unit |
| **Session** | Auth session |
| **ApiKey** | Integration credential |

---

## 2. Estate & twin

| Entity | Description |
|--------|-------------|
| **ConfigurationItem (CI)** | Any managed object |
| **Relationship** | Typed edge between CIs |
| **BusinessService** | Business-facing service |
| **Application** | Software system |
| **Host** | Server/VM |
| **Cluster** | K8s/orchestrator cluster |
| **Container** / **Pod** | Runtime units |
| **CloudResource** | Cloud object |
| **NetworkDevice** | Network CI |
| **Database** | Data store CI |
| **Owner** | Person/Team ownership |
| **Environment** | prod/stage/dev |
| **Tag** / **Label** | Metadata |

---

## 3. Observability (canonical)

| Entity | Description |
|--------|-------------|
| **MetricSeries** | Named time series |
| **LogRecord** | Normalized log hit |
| **Trace** / **Span** | Distributed trace |
| **Alert** | Threshold/anomaly firing |
| **Sli** / **Slo** | Objectives |
| **SyntheticCheck** | Probe definition/result |

Stored/queried via Observe domain; may physically live in engine stores.

---

## 4. Security

| Entity | Description |
|--------|-------------|
| **SecurityFinding** | Unified finding |
| **SecurityEvent** | Raw/normalized event |
| **Agent** | Endpoint agent projection |
| **Vulnerability** | Vuln instance |
| **ComplianceControl** | Control object |
| **Evidence** | Attestation artifact |

---

## 5. ITSM / operations

| Entity | Description |
|--------|-------------|
| **Incident** | Incident record + workspace state |
| **Problem** | Problem record |
| **Change** | Change record |
| **KnowledgeArticle** | KB |
| **Comment** / **Watcher** | Collaboration |
| **Activity** | Timeline/audit for ticket |

---

## 6. Automation & AI

| Entity | Description |
|--------|-------------|
| **Runbook** | Procedure definition |
| **Automation** / **Workflow** | Automatable process |
| **AutomationRun** | Execution instance |
| **Approval** | Gating record |
| **AiConversation** | Copilot thread |
| **AiRecommendation** | Suggested action |
| **RcaResult** | Structured RCA |

---

## 7. Platform

| Entity | Description |
|--------|-------------|
| **AuditEvent** | Security/compliance audit |
| **Notification** | Outbound message |
| **Report** / **ReportRun** | Generated artifacts |
| **License** / **Entitlement** | Commercial gates |
| **Connector** | Engine connection config (no secrets in row) |
| **PluginInstallation** | Marketplace install |
| **SolutionPack** | Vertical pack |

---

## 8. Relationships (selected)

```text
Organization 1─* Tenant
Tenant 1─* User, CI, Incident, ...
BusinessService *─* Application *─* CI
CI *─* CI via Relationship
Alert *─* Incident
Incident *─* CI, BusinessService
Finding *─* CI
Change *─* CI
AutomationRun *─ Incident|Change|CI
Report *─ Incident|Tenant snapshot
```

---

## 9. Identity reconciliation

```text
external_refs: [{ system: "wazuh", id: "..." }, { system: "netbox", id: "..." }]
```

Merge policy documented per adapter; CMDB UUID remains primary key.

---

## 10. Storage mapping (logical)

| Store | Entities |
|-------|----------|
| PostgreSQL | Tenancy, ITSM, CMDB, audit, connectors, reports metadata |
| Redis | Sessions, cache, queues |
| Twin graph store | Projected nodes/edges |
| Object storage | Report binaries, evidence |
| Engine stores | High-volume telemetry (via adapters) |

Physical schemas evolve via versioned migrations — no manual prod edits.
