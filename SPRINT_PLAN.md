# OpsEdge360 — Sprint Plan (Standalone Product)

**Product:** OpsEdge360  
**Repository:** OpsEdge360  
**Version:** 1.0.0 (GA)  
**Date:** 4 July 2026  
**Rule:** Independent from LeadEdge360 / RetailEdge360 — no Suite merge tasks

---

## Sprint gates (every sprint)

- [ ] `npm run build` PASS (OpsEdge360 monorepo)
- [ ] `npm run db:migrate` PASS on clean Postgres
- [ ] Tenant isolation check PASS
- [ ] `scripts/opsedge360-smoke.mjs` PASS (add in S1)
- [ ] Sprint completion report in `docs/sprints/`
- [ ] Git tag `opsedge360-sprint-N`

---

## Overview

| Sprint | Theme | Duration | Status |
|--------|-------|----------|--------|
| **S0** | Platform foundation (Phases 1–4) | — | ✅ Complete |
| **S1** | Product identity & production shell | 2 weeks | ✅ Complete | Auth UI, landing, prod compose, nginx doc |
| **S2** | Discovery & agents | 2 weeks | ✅ Complete | Connectors UI, agents, schedules, wizards, retest |
| **S3** | CMDB & relationships | 2 weeks | ✅ Complete | CI CRUD, relationships, stats, import/export |
| **S4** | Topology & digital twin | 2 weeks | ✅ Complete | Graph polish, impact BFS, blast-radius UI |
| **S5** | Infrastructure monitoring | 2 weeks | ✅ Complete | Scrape targets, hosts, alerts, channels |
| **S6** | APM & OTLP | 2 weeks | ✅ Complete | OTLP persist, service map, log search |
| **S7** | Business transactions | 2 weeks | ✅ Complete | Flow map, correlation, SLA/SLO dashboards |
| **S8** | Banking360 industry pack | 2 weeks | ✅ Complete | BFSI pack, RBI/PCI, UPI templates |
| **S9** | AI copilot & RCA | 2 weeks | ✅ Complete | Shell panel, RCA workflow, recommendations |
| **S10** | Production GA | 2 weeks | ✅ Complete | Pen-test, backup/restore, HA smoke, v1.0.0 |

**S0 delivered:** 12 microservices, gateway, web UI, migrations, SaaS/Hybrid/On-prem config.

---

## Sprint 1 — Product identity & production shell

**Goal:** OpsEdge360 branded standalone product ready for VPS deploy.

| ID | Task | Est. |
|----|------|------|
| OBS1-01 | Rebrand UI shell → OpsEdge360 (title, nav, metadata) | 4h |
| OBS1-02 | `docs/PRODUCT_IDENTITY.md` + `360/README.md` product boundary | 4h |
| OBS1-03 | Standalone auth: tenant signup/login pages in `apps/web` | 16h |
| OBS1-04 | Production `docker-compose.prod.yml` + nginx sample | 12h |
| OBS1-05 | Env template: `OBS360_PUBLIC_URL`, `JWT_SECRET`, `DEPLOYMENT_MODE` | 4h |
| OBS1-06 | `scripts/opsedge360-smoke.mjs` — health, auth, tenant isolation | 8h |
| OBS1-07 | Marketing landing page at `/` (product, not Suite) | 8h |
| OBS1-08 | Remove any Suite-integration stubs if present | 2h |
| OBS1-09 | Sprint 1 report | 2h |

**Exit:** `observability360.asoftechinsightz.com` deploy checklist ready; smoke PASS.

**Explicitly out of scope:** Suite proxy routes, shared JWT with Mongo CRM, product switcher.

---

## Sprint 2 — Discovery & agents

| ID | Task | Est. |
|----|------|------|
| OBS2-01 | Discovery connector admin UI polish | 12h |
| OBS2-02 | Agent registration & heartbeat API | 12h |
| OBS2-03 | K8s / AWS / SNMP connector wizards | 12h |
| OBS2-04 | Scheduled scan jobs + notifications | 8h |
| OBS2-05 | Discovery retest script | 6h |

---

## Sprint 3 — CMDB

| ID | Task | Est. |
|----|------|------|
| OBS3-01 | CI CRUD UI completeness | 12h |
| OBS3-02 | Relationship graph editor | 12h |
| OBS3-03 | CMDB stats dashboard | 8h |
| OBS3-04 | Import/export (CSV/JSON) | 8h |

---

## Sprint 4 — Topology

| ID | Task | Est. |
|----|------|------|
| OBS4-01 | Digital twin graph (Neo4j or PG adjacency) | 16h |
| OBS4-02 | Dependency impact analysis | 12h |
| OBS4-03 | Blast-radius visualization | 8h |

---

## Sprint 5 — Infrastructure monitoring

| ID | Task | Est. |
|----|------|------|
| OBS5-01 | Prometheus scrape config UI | 8h |
| OBS5-02 | Host / network dashboards | 12h |
| OBS5-03 | Alert rules + notification channels | 12h |

---

## Sprint 6 — APM & OTLP

| ID | Task | Est. |
|----|------|------|
| OBS6-01 | OTLP ingest hardening (metrics, logs, traces) | 12h |
| OBS6-02 | Service map from traces | 12h |
| OBS6-03 | Log search UI (OpenSearch integration) | 12h |

---

## Sprint 7 — Business transactions

| ID | Task | Est. |
|----|------|------|
| OBS7-01 | Transaction flow map UI | 12h |
| OBS7-02 | Cross-service correlation | 12h |
| OBS7-03 | SLA / latency SLO dashboards | 8h |

---

## Sprint 8 — Banking360

| ID | Task | Est. |
|----|------|------|
| OBS8-01 | BFSI industry pack activation UI | 8h |
| OBS8-02 | RBI / PCI control dashboards | 12h |
| OBS8-03 | UPI / payment flow monitoring templates | 12h |

---

## Sprint 9 — AI copilot

| ID | Task | Est. |
|----|------|------|
| OBS9-01 | Unified copilot panel in shell | 12h |
| OBS9-02 | RCA workflows (LangGraph agents) | 16h |
| OBS9-03 | Recommendation engine surfacing | 8h |

---

## Sprint 10 — Production GA

| ID | Task | Est. |
|----|------|------|
| OBS10-01 | Pen test remediation | 16h |
| OBS10-02 | Backup / restore runbook + drill | 8h |
| OBS10-03 | HA smoke (gateway + Postgres replica) | 8h |
| OBS10-04 | GA release notes + v1.0.0 tag | 4h |

---

## Related docs

- Audit pack (historical): `asoftech-insightz/docs/observability360/`
- Architecture (standalone): same folder `ARCHITECTURE.md` v2.0
- LeadEdge sprints: `asoftech-insightz/SPRINT_PLAN.md` (no OpsEdge360 tasks)
