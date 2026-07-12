# OpsEdge360 — Feature Inventory

**Assessment date:** 2026-07-12  
**Baseline:** `release/v1.0.0-ga` @ `4222b45`  
**Legend:** **C** = Completed · **P** = Partially Completed · **M** = Missing · **D** = Deprecated

---

## Platform foundation

| Feature | Status | Evidence |
|---------|--------|----------|
| Multi-tenant org model | C | `tenants`, JWT `tenantId`, `X-Tenant-ID` |
| Auth login / signup / refresh | C | `/api/v1/auth/*` |
| Password reset | C | tokens + UI |
| SSO OIDC / SAML | C | `/auth/sso`, admin IdP pages |
| LDAP / AD login | P | integrations identity connectors |
| RBAC permissions | C | `PermissionIds`, roles, guards |
| ABAC policies | C | `abac_policies` |
| API keys | C | migration 015 |
| MFA / WebAuthn | M | — |
| Service JWT + SPIFFE mTLS | C | trust mesh, CMDB mTLS |
| Secrets store + rotation | P | local crypto; cloud providers stub |
| Dual-layer audit + legal hold | C | 017 + admin audit |
| Rate limiting (auth) | P | in-memory + DB buckets |
| Environment labels (Dev/Demo/UAT/Prod) | P | `DEPLOYMENT_MODE`; no full demo isolation |
| Dedicated Demo tenant/DB/banner | M | RC seed only |

---

## Discovery & CMDB

| Feature | Status | Evidence |
|---------|--------|----------|
| Discovery connectors (cloud/k8s/OT/network) | C | `services/discovery` registry |
| Discovery agents / schedules / jobs | C | UI `/discovery`, `/discovery-ops` |
| CMDB CIs + relationships | C | cmdb service |
| Topology / application map | C | `/topology`, `/cmdb` |
| Digital twin / blast radius | C | `/twin` |
| Drift detection | C | `/cmdb/drift` |
| Asset lifecycle CMDB depth | P | base present; ServiceNow-class CMDB depth incomplete |
| Universal / host agents | C | `/fleet`, agent packages |

---

## Observability & APM

| Feature | Status | Evidence |
|---------|--------|----------|
| OTLP metrics/logs/traces | C | observability service |
| Prometheus scrape / remote_write | C | infra + DB tables |
| Host metrics / alerts | C | 008 |
| APM service map / traces | P | `/apm` — demo ingest helpers |
| Log analytics (search/SIEM-class) | P | OTLP logs; not Splunk-class UX |
| Distributed tracing UI | P | Jaeger in compose; product UX partial |
| Network flows / SNMP | P | `/network` |
| K8s / Docker / VMware monitoring depth | P | discovery connectors; deep monitors partial |
| Database / storage monitoring | P | connectors; specialized DB APM missing |
| Capacity planning | P | predictive + admin capacity |
| Synthetic HTTP/API monitors | M | scrape fallback ≠ synthetics |
| Browser synthetic journeys | M | — |
| Multi-location / private synthetic agents | M | — |
| Core Web Vitals collection | M | — |

---

## AIOps & AI

| Feature | Status | Evidence |
|---------|--------|----------|
| LLM gateway / usage | C | `/ai/*`, migration 028 |
| Multi-signal correlation | C | 029 |
| RCA sessions | C | AI + copilot |
| Predictive anomaly / capacity | C | 030, `/analytics` |
| Knowledge graph | C | 032 |
| Copilot chat | C | `/copilot` + shell drawer |
| Autonomous agents + approvals | C | `ai-agents`, `/agents` |
| Controlled remediation | C | remediation service + automation |
| Auto remediation (unguarded) | D | intentionally blocked without policy/approval |
| Executive AI summaries | P | executive KPIs; narrative AI partial |
| Cloud cost optimization AI | M | — |

---

## Automation & ITSM

| Feature | Status | Evidence |
|---------|--------|----------|
| Workflows / runbooks / simulations | C | `/automation/*`, admin automation pages |
| Approvals + emergency stop | C | Wave 4 |
| Incident management (full ITSM) | P | ops incidents exist; not ServiceNow ITSM |
| Problem / Change management | M | — |
| Service catalog | M | — |
| Knowledge base | P | KG / RAG ≠ enterprise KB |
| SLA management | P | transaction SLOs; ITSM SLAs thin |
| Maintenance windows | M | — |

---

## Security & compliance

| Feature | Status | Evidence |
|---------|--------|----------|
| Security posture / anomalies / fraud | P | security service + UI |
| SIEM webhook ingest | P | present; depth limited |
| SOAR playbooks | P | automation/remediation overlap |
| Vulnerability management | M | — |
| Zero Trust visibility | P | trust mesh / identities |
| Security observability dashboards | C | `/security-observability`, `/security` |
| Compliance frameworks | P | compliance service + packs |
| Banking360 | C | dedicated UI + engine |
| ISO/PCI/HIPAA/GDPR/NIST packs | P | frameworks exist; scorecards uneven |
| IEC 62443 / OT compliance depth | P | OT page + protocols; compliance thin |

---

## OT / ICS

| Feature | Status | Evidence |
|---------|--------|----------|
| OPC-UA / Modbus / MQTT discovery | C | discovery connectors |
| OT safety zones | P | remediation OT zones |
| OT dashboard | P | `/ot` |
| PLC/SCADA/DCS deep monitoring | M | protocol discovery ≠ deep OT platform |
| BACnet | M | — |
| Predictive maintenance (OT) | P | analytics generic |
| Digital twin (industrial) | P | twin exists; OT-specific twin incomplete |

---

## Business & executive

| Feature | Status | Evidence |
|---------|--------|----------|
| Executive home KPIs | C | `/dashboard` |
| Business transactions / SLOs | C | `/transactions` |
| Ops dashboards + widgets | P | CRUD; no DnD |
| Sustainability / carbon | P | `/sustainability` |
| Revenue / customer journey monitors | M | — |
| Industry vertical dashboards (20+) | M | Banking360 only deep |

---

## Integrations

| Feature | Status | Evidence |
|---------|--------|----------|
| ServiceNow / Jira | P | catalog + ITSM mapping |
| Slack / Teams / Email / Webhook | P | notification channels |
| Cloud (AWS/Azure/GCP) discovery | C | connectors |
| Prometheus / Grafana / OpenSearch | P | compose + partial product UX |
| Datadog / Dynatrace / New Relic / Splunk ingest | M | — |
| GitHub / GitLab | M | — |
| Network security vendors (Palo/Fortinet/…) | M | — |

---

## Admin, deploy, certification

| Feature | Status | Evidence |
|---------|--------|----------|
| Enterprise Admin Center | C | `/admin/*` |
| HA / failover / replication metadata | C | Wave 2 |
| Backup / restore certification | C | Wave 6 |
| Air-gap packaging | C | scripts |
| Helm chart | P | gateway/web focused |
| Wave 7 certification suites | C | load/chaos/soak |
| RC packaging / OpenAPI / pilot | C | Wave 8 |
| GA regression / signoff | C | Wave 9 + `P5_GA_VALIDATION_OK` |
| Quantum readiness module | P | `/quantum` experimental value |

---

## Summary counts (approx.)

| Status | Count (inventory rows) |
|--------|------------------------|
| Completed | ~55 |
| Partial | ~45 |
| Missing | ~35 |
| Deprecated / intentionally constrained | ~1 |

See [FEATURE_GAP_ANALYSIS.md](./FEATURE_GAP_ANALYSIS.md) for prioritized gaps.
