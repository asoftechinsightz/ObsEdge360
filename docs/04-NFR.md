# OpsEdge360 — Non-Functional Requirements (NFR)

**Version:** 1.0  
**Document ID:** TRN-NFR-001

---

## 1. Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-PERF-01 | API response time (p95) | < 200ms for read, < 500ms for write |
| NFR-PERF-02 | Discovery event processing | < 5s from detection to CMDB update |
| NFR-PERF-03 | Digital twin graph query | < 2s for 10K node subgraph |
| NFR-PERF-04 | Telemetry ingestion | 100K events/sec per tenant (horizontal scale) |
| NFR-PERF-05 | Dashboard load time | < 3s initial render |
| NFR-PERF-06 | Transaction correlation | < 10s for end-to-end trace assembly |

## 2. Scalability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-SCALE-01 | Horizontal scaling | All stateless services scale via K8s HPA |
| NFR-SCALE-02 | Asset capacity | 1M+ CIs per tenant |
| NFR-SCALE-03 | Multi-region | Active-active or active-passive DR |
| NFR-SCALE-04 | Connector parallelism | 10K concurrent discovery targets |

## 3. Availability & Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-AVAIL-01 | Platform SLA | 99.95% uptime |
| NFR-AVAIL-02 | RPO | < 15 minutes |
| NFR-AVAIL-03 | RTO | < 1 hour |
| NFR-AVAIL-04 | Zero-downtime deployments | Rolling updates with health checks |
| NFR-AVAIL-05 | Circuit breakers | All external integrations |

## 4. Security

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-SEC-01 | Authentication | OIDC/SAML SSO, MFA support |
| NFR-SEC-02 | Authorization | RBAC with least privilege |
| NFR-SEC-03 | Encryption at rest | AES-256 for all data stores |
| NFR-SEC-04 | Encryption in transit | TLS 1.3 minimum |
| NFR-SEC-05 | Secrets management | HashiCorp Vault or cloud KMS |
| NFR-SEC-06 | Zero Trust | mTLS between services |
| NFR-SEC-07 | Audit logging | Immutable, tamper-evident |
| NFR-SEC-08 | Penetration testing | Annual third-party assessment |

## 5. Privacy & Data Protection

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-PRIV-01 | GDPR compliance | Right to erasure, data portability |
| NFR-PRIV-02 | Data residency | Configurable per tenant region |
| NFR-PRIV-03 | PII handling | Field-level encryption, masking in logs |
| NFR-PRIV-04 | Data retention | Configurable policies per data class |

## 6. Operability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-OPS-01 | Observability | OpenTelemetry on all services |
| NFR-OPS-02 | Health endpoints | `/health` and `/ready` on every service |
| NFR-OPS-03 | Structured logging | JSON logs with correlation IDs |
| NFR-OPS-04 | Runbooks | Documented for all critical alerts |
| NFR-OPS-05 | Configuration | Environment-based, no secrets in code |

## 7. Maintainability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-MAINT-01 | Code coverage | > 80% unit test coverage |
| NFR-MAINT-02 | API versioning | Semantic versioning, deprecation policy |
| NFR-MAINT-03 | Documentation | OpenAPI, architecture docs, runbooks |
| NFR-MAINT-04 | Modular connectors | Plugin architecture for discovery protocols |

## 8. Compatibility

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-COMPAT-01 | Browsers | Chrome, Firefox, Safari, Edge (last 2 versions) |
| NFR-COMPAT-02 | Cloud providers | AWS, Azure, GCP, Oracle Cloud |
| NFR-COMPAT-03 | Kubernetes | 1.28+ |
| NFR-COMPAT-04 | OpenTelemetry | OTLP 1.x |

## 9. Usability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-UX-01 | Accessibility | WCAG 2.1 AA |
| NFR-UX-02 | Responsive design | Desktop, tablet; mobile read-only |
| NFR-UX-03 | Time to first insight | < 30 min from install to first dashboard |
| NFR-UX-04 | Internationalization | English (Phase 1), Hindi (Phase 2) |

## 10. Compliance (Platform)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-COMP-01 | SOC 2 Type II | Platform certification roadmap |
| NFR-COMP-02 | ISO 27001 | Platform ISMS alignment |
| NFR-COMP-03 | RBI/NPCI readiness | BFSI deployment controls |

## 11. Sustainability (Platform Operations)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-SUS-01 | Carbon-aware scheduling | Optional workload placement by carbon intensity |
| NFR-SUS-02 | Resource efficiency | Auto-scaling down during low demand |

## 12. Disaster Recovery

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-DR-01 | Backup frequency | Hourly incremental, daily full |
| NFR-DR-02 | Cross-region replication | PostgreSQL, Neo4j, OpenSearch |
| NFR-DR-03 | DR testing | Quarterly failover drills |
