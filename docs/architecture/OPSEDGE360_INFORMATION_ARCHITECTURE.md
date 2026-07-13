# OpsEdge360 — Information Architecture

**Document ID:** OE360-IA-P1-001  
**Phase:** 1  
**Parent:** [OPSEDGE360_ENTERPRISE_ARCHITECTURE.md](./OPSEDGE360_ENTERPRISE_ARCHITECTURE.md)

---

## 1. Navigation hierarchy

```text
OpsEdge360
├── Home (Executive / Operations — role default)
├── Twin
│   ├── Graph
│   ├── Blast Radius
│   ├── Drift Overlay
│   └── Executive View
├── Observe
│   ├── Applications
│   ├── Infrastructure
│   ├── Cloud
│   ├── Kubernetes
│   ├── Containers
│   ├── Logs
│   ├── Metrics
│   ├── Traces
│   └── Topology
├── Secure
│   ├── Security Workspace
│   ├── Findings
│   ├── Posture
│   └── Compliance (link)
├── Operate
│   ├── Incidents
│   ├── Problems
│   ├── Changes
│   ├── Business Services
│   └── Knowledge
├── Estate
│   ├── CMDB / Assets
│   ├── Discovery
│   └── Configuration Drift
├── Automate
│   ├── Runbooks
│   ├── Approvals
│   └── Run History
├── Insights
│   ├── Reports
│   ├── Capacity
│   └── Cost
├── Copilot
├── Marketplace
└── Admin
    ├── Users & Roles
    ├── Licensing
    ├── Connectors
    ├── Notifications
    ├── Audit
    └── API Keys
```

Menu items **hide** when entitlement or permission is missing (not disabled clutter).

---

## 2. Roles (baseline)

| Role | Intent |
|------|--------|
| `executive` | Command center, twin executive, reports |
| `sre_operator` | Observe, incidents, automation request |
| `secops` | Security workspace, findings, related incidents |
| `itsm_agent` | Incidents/problems/changes/knowledge |
| `cmdb_manager` | CI edit, discovery accept |
| `automation_admin` | Approve/execute runbooks |
| `compliance_officer` | Controls, evidence, audit reports |
| `tenant_admin` | Users, IdP, connectors |
| `platform_admin` | Cross-tenant break-glass (controlled) |
| `auditor` | Read-only audit + reports |

Roles compose permissions; users may hold multiple roles.

---

## 3. Permission catalog (examples)

| Permission | Modules |
|------------|---------|
| `dashboard:read` | Home |
| `twin:read` / `twin:simulate` | Twin |
| `observe:read` | Observe.* |
| `security:read` / `security:write` | Secure |
| `incident:read` / `incident:write` / `incident:close` | Incidents |
| `change:approve` | Changes |
| `cmdb:write` | Estate |
| `automation:request` / `automation:approve` / `automation:execute` | Automate |
| `report:generate` | Insights |
| `admin:connectors` | Admin |
| `audit:read` | Audit |

SoD: `automation:approve` and `automation:execute` should not be held by the same user in regulated packs (configurable policy).

---

## 4. Object relationships (IA)

```text
BusinessService 1─* Application *─* CI
CI *─* CI (relationships)
Alert → Incident → Problem
Incident *─* CI / BusinessService
Finding → Incident (optional)
Change *─* CI
AutomationRun → Incident / Change
Report → Incident / Compliance / Executive snapshot
```

Search and breadcrumbs follow these edges.

---

## 5. Global search

| Aspect | Design |
|--------|--------|
| Entry | Cmd/Ctrl+K from any screen |
| Sources | CIs, services, incidents, findings, reports, runbooks, users (RBAC filtered) |
| Ranking | Recency + criticality + exact match |
| Actions | Open, pin, “ask Copilot about…” |
| Empty | Suggest modules user can access |

API: `GET /api/v1/search?q=` (existing P0 baseline).

---

## 6. Context navigation

From any entity panel:

- Open in Twin  
- Related incidents / findings  
- Metrics / logs / traces (if observe entitlements)  
- Run automation (gated)  
- Generate report  

Context rail preferred over modal sprawl.

---

## 7. Breadcrumbs

Pattern: `Module / ObjectType / ObjectName / Tab`  
Example: `Operate / Incidents / PAY-Gateway-Outage / Workspace`

Clicking Module returns to list with filters preserved in URL query.

---

## 8. Cross-module navigation rules

1. Deep links carry `tenant` implicitly via session — never in shareable secrets  
2. Workflow query params (`?workflow=`) open guided actions  
3. External engine deep links **forbidden** in customer UI  
4. Copilot citations open OpsEdge routes only  

---

## 9. Responsive IA

| Breakpoint | Nav |
|------------|-----|
| Desktop | Persistent left nav + top bar |
| Tablet | Collapsible left nav |
| Mobile | Bottom primary tabs (Home, Incidents, Twin, Search, More) |

Executive first viewport remains one composition on all sizes.
