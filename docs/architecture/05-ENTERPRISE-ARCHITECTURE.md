# OpsEdge360 — Enterprise Architecture

**Version:** 1.0  
**Document ID:** TRN-EA-001

---

## 1. Architecture Overview

OpsEdge360 follows a **cloud-native, event-driven, microservices architecture** with an AI agent layer orchestrating autonomous operations across IT, OT, network, cloud, security, and business domains.

## 2. Architecture Principles

| Principle | Implementation |
|-----------|----------------|
| Cloud-Native | Containerized services on Kubernetes |
| API-First | OpenAPI 3.1 for all external and internal APIs |
| Event-Driven | Kafka event bus for domain events |
| Zero Trust | mTLS, RBAC, tenant isolation |
| Multi-Tenant | Logical isolation with optional dedicated stacks |
| AI-Native | LangGraph agents with MCP tool integration |
| Observable | OpenTelemetry throughout |
| Quantum Ready | Extensible quantum job schema |

## 3. Domain Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                                │
│  Next.js Web App │ Executive Dashboards │ Digital Twin UI │ Mobile RO   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                        API & GATEWAY LAYER                               │
│  API Gateway (NestJS) │ Auth (OIDC) │ Rate Limiting │ API Versioning    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌──────────────┬──────────────┬──────────────┬──────────────┬─────────────┐
│  Discovery   │    CMDB      │ Observability│  Compliance  │  Security   │
│  Service     │   Service    │   Service    │   Service    │  Service    │
└──────────────┴──────────────┴──────────────┴──────────────┴─────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                        AI AGENT LAYER (Python)                           │
│  Discovery │ RCA │ Remediation │ Compliance │ Fraud │ Documentation     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                        EVENT BUS (Apache Kafka)                          │
│  asset.* │ cmdb.* │ alert.* │ compliance.* │ transaction.* │ agent.*  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌──────────────┬──────────────┬──────────────┬──────────────┬─────────────┐
│ PostgreSQL   │  MongoDB     │   Neo4j      │ OpenSearch   │   Redis     │
│ (relational) │  (events)    │  (graph)     │ (logs/search)│  (cache)    │
└──────────────┴──────────────┴──────────────┴──────────────┴─────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                        CONNECTOR LAYER                                   │
│  SSH │ SNMP │ K8s │ Cloud APIs │ NetFlow │ OPC-UA │ Modbus │ MQTT     │
└─────────────────────────────────────────────────────────────────────────┘
```

## 4. Business Capability Map

| Capability | Services | Data Store |
|------------|----------|------------|
| Asset Discovery | discovery-service | MongoDB (raw), PostgreSQL (CI) |
| CMDB | cmdb-service | PostgreSQL, Neo4j |
| Digital Twin | twin-service (cmdb + graph) | Neo4j |
| Transactions | transaction-service | PostgreSQL, OpenSearch |
| Observability | observability-service | OpenSearch, Prometheus |
| Compliance | compliance-service | PostgreSQL |
| Security/Fraud | security-service | OpenSearch, PostgreSQL |
| AI Agents | ai-agents (Python) | PostgreSQL (checkpoints), Redis |
| Executive BI | web + api aggregation | All stores (read) |

## 5. Integration Architecture

### Inbound
- OTLP collectors (metrics, logs, traces)
- NetFlow/IPFIX/sFlow collectors
- SNMP traps, Syslog
- Cloud provider APIs (AWS, Azure, GCP)
- SIEM/SOAR webhooks
- Identity providers (OIDC/SAML)

### Outbound
- Remediation actions (SSH, K8s API, cloud APIs)
- Notification (email, Slack, PagerDuty)
- SOAR playbooks
- Audit evidence export

## 6. Deployment Models

| Model | Use Case |
|-------|----------|
| SaaS Multi-Tenant | SMB, mid-market |
| Dedicated Tenant | Regulated BFSI, healthcare |
| On-Premises | Air-gapped, defense |
| Hybrid | OT on-prem + cloud analytics |

## 7. Technology Standards

- **Containers**: Docker OCI images
- **Orchestration**: Kubernetes 1.28+
- **Service Mesh**: Istio (optional, recommended for mTLS)
- **IaC**: Terraform + Helm
- **CI/CD**: GitHub Actions
- **Secrets**: Vault / cloud KMS

## 8. Governance

- Architecture Decision Records (ADRs) in `docs/architecture/adr/`
- API review board for breaking changes
- Security review for all connector and agent actions
- OT safety review for industrial protocol connectors
