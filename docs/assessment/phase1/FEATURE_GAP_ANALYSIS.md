# OpsEdge360 — Feature Gap Analysis

**Assessment date:** 2026-07-12  
**Against:** Master Enterprise Prompt (Datadog / Dynatrace / ServiceNow ITOM / Splunk / OT peers)  
**Baseline:** production GA-validated codebase

---

## Method

Gaps are scored by:

1. **Business impact** (sales demos, enterprise deals, regulatory)  
2. **Dependency risk** (blocks other work)  
3. **Reuse opportunity** (existing code can absorb the feature)  
4. **Effort class** (S/M/L/XL)

Priority: **P0** must precede major sales/demo claims · **P1** next enterprise wave · **P2** differentiation · **P3** long-range.

---

## P0 — Blockers for Demo & enterprise trust

| Gap | Current | Target | Impact | Effort | Reuse |
|-----|---------|--------|--------|--------|-------|
| Demo / Production isolation | RC seed script | Dedicated demo tenant + DB + banner + kill-switch for external actions | Sales & safety | L | tenants, Wave8 demo, integrations flags |
| Environment visual labeling | Partial `DEPLOYMENT_MODE` | Dev/Demo/UAT/Staging/Prod badges everywhere | Trust | S | web shell |
| Role-based demo personas | Generic admin signup | CEO/CIO/CISO/SOC/NOC/SRE seeded users + nav | Demo quality | M | RBAC roles |
| Honest capability labeling | Some mock fallbacks | No silent fake “healthy” without data | Trust | S | existing honesty rules |

---

## P1 — Core competitive modules

| Gap | Current | Target | Impact | Effort | Reuse |
|-----|---------|--------|--------|--------|-------|
| Synthetic HTTP/API monitoring | Scrape synthetic fallback | First-class checks (latency, status, TLS, auth, asserts) | Compete w/ Datadog synthetics | L | observability + agents |
| Browser synthetics (Chromium first) | Missing | Multi-step journeys + screenshots + CWV | DEM | XL | new worker + observability |
| Global / private probe locations | Missing | Location registry + private agents | Enterprise DEM | L | universal agent |
| Incident management depth | Ops incidents | ITSM incident lifecycle + ITSM sync | Compete w/ ServiceNow | L | automation + integrations |
| Alert noise reduction productization | Correlation exists | Policy UX + suppressions + routing | Ops efficiency | M | AIOps + alerts |
| Log analytics UX | OTLP ingest | Search, saved queries, fields | Compete w/ Splunk lite | L | OpenSearch |
| Admin IA redesign | 55 chip links | Grouped nav / command palette | UX | M | AdminShell |

---

## P2 — Differentiation & verticals

| Gap | Current | Target | Impact | Effort |
|-----|---------|--------|--------|--------|
| Full ITSM (Problem/Change/Catalog) | Missing | Phased ITSM modules | Deals | XL |
| Vulnerability management | Missing | CVE ingest + risk scoring | SecOps | L |
| Industry packs beyond Banking360 | Thin | Healthcare, Manufacturing, Telecom, Retail packs | Vertical sales | L each |
| OT depth (PLC/SCADA analytics) | Protocol discovery | Asset models + predictive OT | OT deals | XL |
| Drag-drop dashboard studio | Grid save only | react-grid-layout + templates | UX | M |
| Light mode + WCAG pass | Dark-only | Theme + a11y audit | Enterprise UX | M |
| MFA | Missing | TOTP/WebAuthn | Security RFPs | M |
| Cloud cost Copilot | Missing | Cost insights | FinOps | L |

---

## P3 — Long-range / Magic Quadrant breadth

| Gap | Notes |
|-----|-------|
| Multi-browser synthetics (Firefox/Edge) | After Chromium path stable |
| Video recording of journeys | Storage & privacy heavy |
| Native connectors to Datadog/Dynatrace/Splunk | Bidirectional sync |
| Network vendor deep integrations | Palo Alto, Fortinet, Check Point |
| 20 industry solution suites | Template factory after 4–5 packs proven |
| Full multi-language / RTL | After IA + design system |
| Quantum module productization | Keep experimental unless customer-driven |

---

## Gap vs named competitors (honest)

| Competitor strength | OpsEdge360 today |
|---------------------|------------------|
| Datadog APM + Synthetics | APM partial; Synthetics **missing** |
| Dynatrace Davis AI + topology | Topology + AIOps **present**; depth/automation polish behind |
| ServiceNow ITOM | CMDB/discovery **present**; ITSM **thin** |
| Splunk | Log plane **partial** |
| Grafana Enterprise | Dashboards **partial**; no Grafana-class editor |
| Claroty / Dragos / Armis | OT discovery **partial**; OT security platform **missing** |
| Microsoft Sentinel | SIEM ingest **partial**; SOAR **overlap with automation** |

---

## What not to rebuild

- AuthZ / tenant isolation  
- Discovery connector framework  
- CMDB + Neo4j twin  
- Controlled automation + emergency stop  
- Wave 6–9 certification / packaging planes  
- Secrets + trust mesh foundations  

Prefer **extend** over **replace**.

---

## Suggested sequencing (see roadmap)

1. Phase 2 — Demo/Production separation  
2. Synthetic HTTP MVP  
3. Incident + alert productization  
4. Browser synthetics + private agents  
5. Industry pack factory (Healthcare, Manufacturing)  
6. UX premium (theme, DnD, admin IA)  
7. OT & SecOps depth tracks in parallel after P1
