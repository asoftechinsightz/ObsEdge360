# OpsEdge360 — Product Releases (MVP → 3.0)

**Document ID:** OE360-REL-P2-001  
**Phase:** 2  
**Rule:** Every feature has exactly one release assignment. Architecture remains Phase 1 SSOT.

---

## Release overview

| Release | Codename | Intent | Customer proof |
|---------|----------|--------|----------------|
| **MVP** | Enterprise Demo Ready | First enterprise customer demonstration | Full journey, populated twin, unified brand |
| **v1.1** | Harden & Deepen | Immediately after MVP | Stronger adapters, ITSM depth, UX polish |
| **v2.0** | Enterprise Expansion | Scale & packs | Multi-engine HA, marketplace shell, packs |
| **v3.0** | AI-First Operations | Autonomous-assist platform | Advanced AIOps, skills, optimization |

---

## MVP — Enterprise Demo Ready

**Goal:** Convince a buyer OpsEdge360 is a premium Digital Operations Intelligence Platform.

### In scope (Critical)

| ID | Feature | Type |
|----|---------|------|
| MVP-01 | Executive Command Center (aggregated) | Native |
| MVP-02 | Global search | Native |
| MVP-03 | Digital Twin graph (nodes+edges, never empty in demo) | Native |
| MVP-04 | Blast radius / impact view | Native |
| MVP-05 | Business Services health | Native |
| MVP-06 | Incident Workspace lifecycle + close-and-report | Native |
| MVP-07 | Observability façade (metrics/logs/traces/topology) | Integration (SkyWalking/OTel) |
| MVP-08 | Security Workspace (findings, MITRE, evidence, timeline) | Integration (Wazuh) + Native UX |
| MVP-09 | AI Copilot read-only tools + incident summary/RCA assist | Native |
| MVP-10 | Automation dry-run + approval request | Integration (n8n and/or Ansible) |
| MVP-11 | Executive + Incident reports (PDF/XLSX/CSV/JSON) | Native |
| MVP-12 | RBAC + multi-tenant demo org | Native |
| MVP-13 | Audit trail for incident/automation | Native |
| MVP-14 | Branding: OpsEdge360 · AsoftechInsightz only | Native |
| MVP-15 | Banking (or primary) demo pack with realistic data | Native EDE |
| MVP-16 | Adapter health in Admin (neutral names) | Native |
| MVP-17 | Network SoT snapshot sync (read) | Integration (NetBox) — optional if time; twin may use CMDB |
| MVP-18 | CMDB CI browser linked to twin | Native (+ optional GLPI sync) |

### Explicitly out of MVP

Marketplace install UX, full Problem/Change, RUM/synthetic suites, cost FinOps, capacity AI, plugin signing GA, GraphQL, AWX full UI parity.

---

## Version 1.1 — Harden & Deepen

| ID | Feature | Priority |
|----|---------|----------|
| 11-01 | NetBox bidirectional sync + webhooks | High |
| 11-02 | GLPI incident/asset sync | High |
| 11-03 | Problem + Change minimal modules | High |
| 11-04 | Knowledge articles linked to incidents | Medium |
| 11-05 | Notification channels (email + webhook + chat) | High |
| 11-06 | Observe: saved views, compare deploys | High |
| 11-07 | Security: automation playbook triggers (gated) | High |
| 11-08 | AI: NL search + runbook draft (gated) | High |
| 11-09 | Light + dark theme certification | Critical |
| 11-10 | Accessibility AA pass on primary journeys | Critical |
| 11-11 | Connector upgrade/health/runbooks | High |
| 11-12 | Additional demo packs: Retail, Cloud-Native | High |
| 11-13 | On-prem install profile documentation + scripts | High |
| 11-14 | Report scheduling | Medium |

---

## Version 2.0 — Enterprise Expansion

| ID | Feature | Priority |
|----|---------|----------|
| 20-01 | Marketplace shell (install packs/plugins) | Critical |
| 20-02 | Solution packs: Banking360 GA, Healthcare/Retail beta | Critical |
| 20-03 | Plugin signing + sandbox | Critical |
| 20-04 | HA/DR certification suites | Critical |
| 20-05 | Capacity planning module | High |
| 20-06 | Cost optimization module | High |
| 20-07 | Configuration drift module GA | High |
| 20-08 | SSO enterprise matrix (OIDC/SAML) certified | Critical |
| 20-09 | Public API GA + SDK beta | Critical |
| 20-10 | Customer outbound webhooks GA | High |
| 20-11 | Synthetic monitoring foundations | Medium |
| 20-12 | ServiceNow adapter (optional ITSM coexist) | Medium |
| 20-13 | GraphQL twin queries (beta) | Medium |
| 20-14 | Air-gap license + offline updates | High |

---

## Version 3.0 — AI-First Operations

| ID | Feature | Priority |
|----|---------|----------|
| 30-01 | AI correlation engine GA | Critical |
| 30-02 | Policy-based auto-remediation (bounded) | Critical |
| 30-03 | AI capacity + cost copilots | High |
| 30-04 | AI executive narrative reports | High |
| 30-05 | Pack skills marketplace | High |
| 30-06 | Multi-agent orchestration (MCP-ready) | High |
| 30-07 | Continuous compliance evidence AI | Medium |
| 30-08 | Predictive incident prevention | Medium |
| 30-09 | Industry packs: Manufacturing360, Government360 | High |

---

## Assignment rule

Any new idea must be tagged `MVP | 1.1 | 2.0 | 3.0 | Deferred` before backlog entry.  
See [OPSEDGE360_FEATURE_PRIORITIZATION.md](./OPSEDGE360_FEATURE_PRIORITIZATION.md).
