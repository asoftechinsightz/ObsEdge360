# OpsEdge360 — Demo Scenario Design

**Document ID:** OE360-DEMO-P2-001  
**Phase:** 2  
**Rule:** **Do not leave dashboards empty.** Every MVP demo pack ships realistic data.

---

## 1. Demo platform requirements

| Requirement | Standard |
|-------------|----------|
| Brand | OpsEdge360 only |
| Twin | Nodes **and** edges &gt; 0 |
| Incidents | ≥ 5 open/recent with workspace depth |
| Findings | ≥ 5 security findings with MITRE fields |
| Business services | ≥ 8 with owners/SLO |
| Reports | At least one executive + one incident closure |
| AI | Pre-seeded RCA-ready incident |
| Automation | One dry-run success artifact |

Primary pack today: **Asoftech Global Bank (EDE)** — extend pattern to others.

---

## 2. Banking (primary MVP)

| Layer | Populate |
|-------|----------|
| Business | UPI Payments, Cards, Core Banking, Mobile Banking, Fraud, Treasury |
| Apps | Payment API, Gateway, Fraud engine, Notification svc |
| Infra | App servers, DB primary/replica, Redis, Kafka, K8s clusters |
| Data | PostgreSQL, Redis, object store |
| Network | Edge FW, LB, DNS |
| Security | Fraud drift, FIM, vuln, SCA findings |
| Ops | Payment Gateway Failure incident (Scenario 1), Security incident (Scenario 5) |
| AI | RCA hypotheses on payment path |
| Reports | Executive daily + incident closure |

**Talk track:** “One platform from board KPI to packet/trace to fix.”

---

## 3. Retail

| Layer | Populate |
|-------|----------|
| Business | E-commerce checkout, POS, Inventory, Loyalty |
| Story | Checkout latency → cart service → DB pool → incident → twin → report |
| Security | PCI-oriented findings (illustrative) |

---

## 4. Healthcare

| Layer | Populate |
|-------|----------|
| Business | EHR access, Appointments, Claims |
| Story | EHR availability → dependency on identity + DB → compliance overlay |
| Note | Illustrative data only; no real PHI |

---

## 5. Manufacturing

| Layer | Populate |
|-------|----------|
| Business | Production line MES, SCADA gateway (IT/OT illustrative) |
| Story | Line stoppage risk → network device → twin blast → change freeze |

---

## 6. Cloud Native

| Layer | Populate |
|-------|----------|
| Focus | Multi-account cloud resources, serverless, managed DB |
| Story | Cost/health anomaly → resource → service impact |

---

## 7. Kubernetes

| Layer | Populate |
|-------|----------|
| Focus | Clusters, namespaces, deployments, HPA, CrashLoop |
| Story | Pod restart storm → service SLO → trace → automation restart dry-run |

---

## 8. Scenario scripts (MVP must-run)

| ID | Name | Journey |
|----|------|---------|
| DS-1 | Payment Gateway Failure | Journey A |
| DS-2 | Security Incident / Fraud | Journey B |
| DS-3 | K8s Restart Storm | Journey A variant |
| DS-4 | Executive Morning Brief | Journey F |

Each script lists: persona, clicks, expected widgets, evidence to capture.

---

## 9. Data seeding principles

1. Deterministic IDs for demos where possible  
2. Reset/load API (EDE) idempotent  
3. Relationships preferential for twin edges  
4. Timestamps “fresh” (within 24h)  
5. Owners and regions always set on tier-1 services  

---

## 10. Empty-state policy

If a widget would be empty in demo: **fix data or hide widget** — never show barren charts in customer demos.
