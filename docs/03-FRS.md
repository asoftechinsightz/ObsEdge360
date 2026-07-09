# OpsEdge360 — Functional Requirements Specification (FRS)

**Version:** 1.0  
**Document ID:** TRN-FRS-001

---

## 1. Module: Universal Discovery Engine

### FR-DIS-001 — Asset Discovery
The system SHALL discover physical servers, VMs, containers, K8s workloads, cloud resources, network devices, databases, middleware, APIs, SaaS apps, IoT/OT devices.

### FR-DIS-002 — Discovery Protocols
Support: SSH, WMI, SNMP, REST, ICMP, NetFlow, IPFIX, gNMI, Syslog, OPC-UA, Modbus, MQTT, BACnet, DNP3, IEC 61850, K8s/VMware/Cloud APIs.

### FR-DIS-003 — Continuous Discovery
Discovery runs continuously; changes emit `asset.discovered`, `asset.updated`, `asset.removed` events to Kafka.

### FR-DIS-004 — Connector Management
Admin UI and API to configure, test, enable/disable discovery connectors per tenant.

---

## 2. Module: Enterprise CMDB

### FR-CMDB-001 — Configuration Items
Store CI types: server, vm, container, database, application, service, network_device, ot_device, cloud_resource, user, location.

### FR-CMDB-002 — Relationships
Support relationship types: depends_on, runs_on, connects_to, owned_by, part_of, secures, monitors.

### FR-CMDB-003 — Lifecycle & History
Track CI lifecycle states: discovered, active, maintenance, decommissioned. Full change history with versioning.

### FR-CMDB-004 — Scores
Each CI carries: health_score, compliance_score, risk_score, ai_confidence_score (0–100).

### FR-CMDB-005 — Service Mapping
Map business services to underlying CIs automatically via dependency traversal.

---

## 3. Module: Digital Twin

### FR-DT-001 — Graph Model
Enterprise topology stored in Neo4j with real-time sync from CMDB events.

### FR-DT-002 — Visualization
Interactive topology map using Cytoscape.js with domain filters (IT, OT, network, security).

### FR-DT-003 — Real-Time Updates
WebSocket push updates topology within 60 seconds of CMDB change.

### FR-DT-004 — Layers
Toggle layers: business services, applications, infrastructure, network, security controls, sustainability.

---

## 4. Module: Business Transaction Discovery

### FR-BTX-001 — Transaction Templates
Pre-built templates: login, UPI, NEFT, RTGS, loan processing, claims, checkout, manufacturing batch.

### FR-BTX-002 — AI Classification
LLM-based classification of custom transactions from trace/log patterns.

### FR-BTX-003 — End-to-End Mapping
Map: Customer → Channel → Gateway → Auth → Microservices → Queues → DB → Network → Outcome.

### FR-BTX-004 — Correlation
Join metrics, logs, events, distributed traces into unified transaction timeline.

---

## 5. Module: Observability

### FR-OBS-001 — Telemetry Ingestion
Accept OTLP metrics, logs, traces via collectors and agents.

### FR-OBS-002 — Network Monitoring
SNMP polling, NetFlow/IPFIX/sFlow ingestion, interface utilization, routing health.

### FR-OBS-003 — OT Monitoring
OPC-UA, Modbus, MQTT read-only polling with safety rate limits.

### FR-OBS-004 — Dashboards
Domain dashboards: infrastructure, applications, network, OT, security, transactions.

---

## 6. Module: AI & Agentic Intelligence

### FR-AI-001 — Discovery Agent
Autonomously identifies unknown assets and proposes CMDB entries.

### FR-AI-002 — RCA Agent
Correlates alerts across domains; produces root cause hypothesis with evidence chain.

### FR-AI-003 — Remediation Agent
Executes approved runbooks (restart service, scale pod, block IP) with policy gates.

### FR-AI-004 — Compliance Agent
Maps infrastructure state to control requirements; flags drift.

### FR-AI-005 — Human-in-the-Loop
High-risk actions require approval via workflow (email, Slack, in-app).

---

## 7. Module: Compliance & Governance

### FR-CMP-001 — Framework Library
ISO 27001, ISO 20000, ISO 22301, NIST CSF, CIS, SOC 2, PCI DSS, GDPR, HIPAA, COBIT, ITIL, RBI CSF, NPCI, SWIFT CSP.

### FR-CMP-002 — Continuous Validation
Scheduled and event-triggered control checks against live CI state.

### FR-CMP-003 — Evidence Collection
Auto-collect config snapshots, logs, access records linked to controls.

### FR-CMP-004 — Compliance Scoring
Per-framework, per-domain, per-CI compliance scores with trend history.

---

## 8. Module: Fraud & Anomaly Detection

### FR-FRD-001 — Detection Types
Infrastructure, network, application, database, user behavior, identity, API abuse, payment anomalies, ransomware indicators, data exfiltration.

### FR-FRD-002 — Adaptive Baselines
ML models learn normal behavior per CI/transaction; seasonal adjustment supported.

### FR-FRD-003 — Explainability
Every alert includes: anomaly type, deviation magnitude, affected CIs, recommended actions.

---

## 9. Module: Security Intelligence

### FR-SEC-001 — Integrations
SIEM, SOAR, IdP, EDR, vulnerability scanners, CSPM, API security tools.

### FR-SEC-002 — Contextual Correlation
Security events enriched with CMDB, transaction, and business service context.

---

## 10. Module: Sustainability

### FR-SUS-001 — Metrics
Energy consumption, carbon emissions, water usage, PUE, cooling efficiency, renewable %, idle resources.

### FR-SUS-002 — Recommendations
AI-generated efficiency and rightsizing recommendations with projected savings.

---

## 11. Module: Executive BI

### FR-EXE-001 — Role Dashboards
CIO, CTO, CISO, COO, CFO, ops, security, audit, compliance officer views.

### FR-EXE-002 — KPIs
Business health, availability, revenue at risk, customer impact, compliance score, security posture, sustainability score, fraud alerts, enterprise risk, SLA performance.

---

## 12. Module: Platform Services

### FR-PLT-001 — Multi-Tenancy
Tenant isolation at data, compute, and network layers.

### FR-PLT-002 — RBAC
Role-based access with fine-grained permissions per module.

### FR-PLT-003 — API-First
All capabilities exposed via versioned REST APIs (OpenAPI 3.1).

### FR-PLT-004 — Audit Log
Immutable audit trail for all user and agent actions.

### FR-PLT-005 — Quantum Readiness
Extensible schema and APIs for quantum job monitoring (Phase 4).

---

## 13. API Summary

See [openapi/trinetra360-v1.yaml](../openapi/trinetra360-v1.yaml) for full specification.

| Domain | Base Path |
|--------|-----------|
| Discovery | `/api/v1/discovery` |
| CMDB | `/api/v1/cmdb` |
| Digital Twin | `/api/v1/twin` |
| Transactions | `/api/v1/transactions` |
| Observability | `/api/v1/observability` |
| Compliance | `/api/v1/compliance` |
| Security | `/api/v1/security` |
| AI Agents | `/api/v1/agents` |
| Executive | `/api/v1/executive` |
