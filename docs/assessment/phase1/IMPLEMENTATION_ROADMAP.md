# OpsEdge360 — Implementation Roadmap

**Program:** Master Enterprise Platform (post–Phase 5 GA foundation)  
**Assessment date:** 2026-07-12  
**Rule:** No implementation until Phase 1 assessment is accepted. Preserve backward compatibility. Prefer extend over rewrite.

---

## Program phases (aligned to master prompt)

| Phase | Name | Goal | Exit criteria |
|-------|------|------|---------------|
| **1** | Complete Platform Review | This document set | Stakeholder sign-off on assessment |
| **2** | Demo & Production Separation | Safe demos without prod risk | Demo banner + isolated DB/tenant + outbound kill-switch + refresh job |
| **3A** | Observability depth | Competitive monitoring core | Synthetic HTTP MVP + log search MVP + APM polish |
| **3B** | Synthetic browser & DEM | Journey monitoring | Chromium journeys + CWV + private agent |
| **3C** | AIOps productization | Noise reduction + RCA UX | Policy UX + executive summaries |
| **3D** | ITSM foundation | Incident + SLA + change (phased) | Incident lifecycle synced to ITSM connectors |
| **3E** | SecOps / OT tracks | Parallel specialization | Vuln MVP; OT asset model MVP |
| **3F** | Industry solutions factory | Vertical packs | ≥4 packs (Banking exists + 3 new) |
| **3G** | Enterprise UX premium | Theme, IA, DnD, a11y | Design system primitives + admin IA + light mode |
| **4** | Scale & MQ narrative | Perf, HA on K8s, integrations breadth | Staging full-scale report + expanded Helm |

---

## Near-term waves (recommended after sign-off)

### Wave A — Demo Platform (Phase 2) — **P0**

**Scope**

- `APP_ENV` / `OPS_EDGE_ENV` ∈ {development, demo, uat, staging, production}  
- Dedicated demo Postgres + seed industries (banking, healthcare, manufacturing, retail, telecom, gov, logistics, cloud/k8s)  
- Demo users: Admin, CEO, CIO, CTO, CISO, SOC, NOC, DevOps, SRE, Ops Manager  
- Visible **Demo Environment** banner on every page  
- Disable: email/SMS/WhatsApp/ticket/production webhooks  
- Auto-refresh schedule (e.g. nightly truncate+seed)  
- Migration only if required (e.g. `042_demo_environment.sql` for demo flags / refresh runs)

**Non-goals:** New monitoring products; UI redesign beyond banner + env chip.

### Wave B — Synthetic HTTP MVP — **P1**

- Check definitions, locations (single region first), results, alerting  
- Reuse observability DB + universal agent where possible  
- Admin + product UI under `/synthetics`

### Wave C — Incident + Alert UX — **P1**

- Incident entity lifecycle on existing ops intelligence  
- Suppression / routing policies  
- ServiceNow/Jira ticket create behind non-demo gate

### Wave D — Browser Synthetics — **P1/P2**

- Chromium worker; multi-step scripts; screenshots; CWV  
- Firefox/Edge later

### Wave E — UX & Admin IA — **P1** (can parallelize lightly)

- Grouped admin nav  
- Design tokens + core primitives  
- Remove placeholder chrome  
- Light mode

### Wave F — Industry Pack Factory — **P2**

- Pack SDK: dashboards + KPIs + compliance mapping + demo datasets  
- Next packs: Healthcare, Manufacturing, Telecom

---

## Explicit non-goals (until later)

- Rewriting API gateway or AuthZ  
- Replacing Neo4j twin  
- Unguarded auto-remediation  
- Claiming full parity with Datadog/ServiceNow/Claroty in one release  
- Renaming / breaking `/api/v1` contracts  

---

## Delivery checklist (every future module)

1. Review existing code (reuse first)  
2. SDS / short design note  
3. Additive APIs + migration if required  
4. Unit + validation script updates  
5. Docs  
6. Deploy + evidence  
7. Return: SHA, files, migration, APIs, tests, deploy status, rollback  

---

## Business-impact priority matrix

| Rank | Initiative | Why |
|------|------------|-----|
| 1 | Demo/Prod isolation | Unlocks safe sales without risking GA prod |
| 2 | Synthetic HTTP | Closes largest observability credibility gap |
| 3 | Admin IA + demo personas | Makes existing power usable |
| 4 | Incident/ITSM depth | Enterprise process buyers |
| 5 | Browser synthetics | DEM competitive wedge |
| 6 | Industry packs | Vertical deals |
| 7 | MFA + cloud KMS | Security RFP checkbox |
| 8 | OT/SecOps depth | Specialized markets |

---

## Decision required from stakeholders

Before coding Phase 2:

1. Accept this Phase 1 assessment package as baseline.  
2. Confirm Demo must be **separate database** (recommended) vs tenant-only isolation (weaker).  
3. Confirm first industry packs after Banking360.  
4. Confirm whether `v1.0.0` Git tag closeout should complete before Wave A starts.

---

## Document index

| # | Document |
|---|----------|
| 1 | [CURRENT_PLATFORM_REVIEW.md](./CURRENT_PLATFORM_REVIEW.md) |
| 2 | [FEATURE_INVENTORY.md](./FEATURE_INVENTORY.md) |
| 3 | [FEATURE_GAP_ANALYSIS.md](./FEATURE_GAP_ANALYSIS.md) |
| 4 | [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md) |
| 5 | [UI_UX_REVIEW.md](./UI_UX_REVIEW.md) |
| 6 | [SECURITY_REVIEW.md](./SECURITY_REVIEW.md) |
| 7 | [DATABASE_REVIEW.md](./DATABASE_REVIEW.md) |
| 8 | [API_REVIEW.md](./API_REVIEW.md) |
| 9 | [PERFORMANCE_REVIEW.md](./PERFORMANCE_REVIEW.md) |
| 10 | [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) (this file) |
