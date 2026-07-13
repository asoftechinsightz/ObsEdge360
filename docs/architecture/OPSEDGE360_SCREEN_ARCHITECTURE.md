# OpsEdge360 — Screen Architecture

**Document ID:** OE360-SCR-P1-001  
**Phase:** 1  
**Rule:** Design screens before coding. Brand: OpsEdge360 · Powered by AsoftechInsightz. No third-party product chrome.

For every screen: **Purpose · Widgets · KPIs · Actions · Navigation · User journey**.

---

## Global shell (all screens)

| Element | Behavior |
|---------|----------|
| Top brand | OpsEdge360 wordmark + “Powered by AsoftechInsightz” |
| Global search | Cmd/Ctrl+K — CIs, incidents, services, findings, reports |
| Persona switch | Executive / Operator / Security / Admin (role-filtered) |
| Tenant context | Always visible |
| Notifications | Bell with unread + deep links |
| Copilot | Persistent entry (right rail or FAB) |
| Breadcrumbs | Module → object → tab |

---

## Screen catalog

### 1. Executive Home / Command Center

| | |
|--|--|
| **Purpose** | Instant estate posture for executives |
| **Widgets** | Health score, risk, open P1s, security criticals, SLO burn, twin snapshot, action cards |
| **KPIs** | Availability, MTTD/MTTR, critical findings, automation success |
| **Actions** | Open incident, view twin impact, generate executive report, ask Copilot |
| **Nav** | Default landing for CIO/exec roles |
| **Journey** | Land → scan posture → drill to domain → act or delegate |

### 2. Operations Center

| | |
|--|--|
| **Purpose** | Live ops board for NOC / SRE |
| **Widgets** | Alert stream, incident queue, topology heat, deploy markers |
| **KPIs** | Open alerts, ack latency, error budget |
| **Actions** | Correlate, assign, suppress, create incident |
| **Journey** | Triage stream → enrich → escalate to Incident Workspace |

### 3. Application Monitoring

| | |
|--|--|
| **Purpose** | Service/app performance |
| **Widgets** | RED/USE charts, trace samples, dependency mini-map, deploy markers |
| **KPIs** | Latency p95/p99, error rate, throughput, Apdex |
| **Actions** | View traces, open twin, create incident |
| **Engine note** | Data via Observability adapter — UI is OpsEdge |

### 4. Infrastructure Monitoring

| | |
|--|--|
| **Purpose** | Hosts, VMs, storage, network health |
| **Widgets** | Host grid, CPU/mem/disk, saturation, related CIs |
| **KPIs** | Saturation, disk forecast, offline hosts |
| **Actions** | Drift check, runbook dry-run, ticket |

### 5. Cloud Monitoring

| | |
|--|--|
| **Purpose** | Cloud accounts/resources posture |
| **Widgets** | Account health, region map, cost pulse, misconfig |
| **KPIs** | Spend anomaly, idle resources, critical misconfigs |
| **Actions** | Cost recommend, compliance check |

### 6. Kubernetes

| | |
|--|--|
| **Purpose** | Clusters, workloads, HPA, events |
| **Widgets** | Cluster list, namespace health, pod restarts, golden signals |
| **KPIs** | CrashLoop, pending pods, node pressure |
| **Actions** | Twin overlay, automation scale check |

### 7. Containers

| | |
|--|--|
| **Purpose** | Container runtime health and image risk |
| **Widgets** | Runtime inventory, vuln density, resource waste |
| **Actions** | Link to Security finding / Change |

### 8. Logs

| | |
|--|--|
| **Purpose** | Search and contextual log investigation |
| **Widgets** | Query bar, histogram, result table, related trace/incident |
| **Actions** | Save query, attach to incident, Copilot summarize |

### 9. Metrics

| | |
|--|--|
| **Purpose** | Metric explorer and dashboards |
| **Widgets** | Query builder, chart, compare, alert from metric |
| **Actions** | Create alert rule, pin to dashboard |

### 10. Traces

| | |
|--|--|
| **Purpose** | Distributed trace analysis |
| **Widgets** | Trace list, waterfall, service map, span attributes |
| **Actions** | Jump to logs, open twin path, create RCA |

### 11. Topology

| | |
|--|--|
| **Purpose** | Layered dependency views (app/network/infra) |
| **Widgets** | Graph canvas, filters, legend, health coloring |
| **Actions** | Simulate impact, open twin, create incident |

### 12. Business Services

| | |
|--|--|
| **Purpose** | Business service health and journeys |
| **Widgets** | Service cards, SLO burn, journey steps, owners |
| **KPIs** | SLO attainment, customer impact |
| **Actions** | Twin executive view, executive report |

### 13. Security Dashboard / Workspace

| | |
|--|--|
| **Purpose** | Security posture and investigation |
| **Widgets** | Findings list, MITRE panel, evidence, timeline, related assets, remediation |
| **KPIs** | Critical open, MTTD, vuln debt |
| **Actions** | Investigate, create incident, trigger automation (gated) |
| **Engine note** | Wazuh-backed; no Wazuh branding |

### 14. Incidents (list + Incident Workspace)

| | |
|--|--|
| **Purpose** | Full lifecycle incident management |
| **Widgets** | Queue, workspace tabs (timeline, RCA, impact, automation, comments, audit) |
| **KPIs** | MTTR, reopen rate |
| **Actions** | Transition states, verify, close-and-report, watch |
| **Journey** | Alert → correlate → workspace → remediate → verify → report |

### 15. Problems

| | |
|--|--|
| **Purpose** | Structural root causes / known errors |
| **Widgets** | Problem list, linked incidents, known error KB |
| **Actions** | Link change, publish KB |

### 16. Changes

| | |
|--|--|
| **Purpose** | Change records and risk |
| **Widgets** | Calendar, risk score, affected CIs, CAB notes |
| **Actions** | Approve, schedule, link deploy markers |

### 17. CMDB / Assets

| | |
|--|--|
| **Purpose** | CI browser and ownership |
| **Widgets** | Search, CI detail, relationships, owners, drift |
| **Actions** | Edit (RBAC), open twin, open tickets |

### 18. Automation

| | |
|--|--|
| **Purpose** | Runbooks, workflow status, approvals |
| **Widgets** | Catalog, runs, approval queue, dry-run results |
| **Actions** | Request, approve, execute, cancel |
| **Engine note** | n8n/Ansible invisible |

### 19. Reports

| | |
|--|--|
| **Purpose** | Generate and export enterprise reports |
| **Widgets** | Templates, history, schedule, preview |
| **Actions** | Export PDF/XLSX/CSV/JSON, share |

### 20. Administration

| | |
|--|--|
| **Purpose** | Platform configuration for admins |
| **Widgets** | Users, IdP, connectors, health, feature flags |
| **Actions** | Rotate secrets, test connector, view audit |

### 21. Marketplace

| | |
|--|--|
| **Purpose** | Discover packs/plugins |
| **Widgets** | Catalog cards, entitlement badges, install status |
| **Actions** | Install (licensed), configure |

### 22. AI Copilot

| | |
|--|--|
| **Purpose** | Conversational ops intelligence |
| **Widgets** | Thread, citations, suggested actions, scope chips |
| **Actions** | Run tool, open entity, draft report, propose automation |
| **Safety** | Clear “advisory” labeling; execute requires gate |

---

## Cross-screen navigation rules

1. Every entity deep-links: CI ↔ Twin ↔ Incident ↔ Finding ↔ Report  
2. Action cards never use dead `#` links  
3. Engine errors surface as OpsEdge “data source unavailable” — never raw upstream stack traces to end users  

---

## Priority build order (post-architecture)

1. Executive Home, Incident Workspace, Twin, Security Workspace  
2. Observability explorers (metrics/logs/traces) behind adapters  
3. Automation approval UX  
4. Admin connectors & Marketplace shell  
