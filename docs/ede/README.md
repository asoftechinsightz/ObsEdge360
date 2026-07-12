# Enterprise Demo Experience (EDE v1.0)

**Purpose:** Make OpsEdge360 feel like a mature enterprise platform for evaluators — without new product modules or backend redesign.

**Label:** All seeded rows are tagged and UI-badged as **Illustrative Demo Data**.

---

## Demo tenant

| Field | Value |
|-------|--------|
| Organization | Asoftech Global Bank (Demo) |
| Slug | `asoftech-global-bank-demo` |
| Admin email | `cio@asoftech-global-bank.demo` |
| Password | `Demo@OpsEdge360!2026` (reset on pack provision) |

### One-click actions

| Action | API |
|--------|-----|
| Status | `GET /api/v1/demo/ede/status` |
| Load into current tenant | `POST /api/v1/demo/ede/load` |
| Provision dedicated org + load | `POST /api/v1/demo/ede/provision` |
| Reset (clear tours + reload pack) | `POST /api/v1/demo/ede/reset` |
| Guided evaluation | `GET /api/v1/demo/ede/guided` · UI `/demo/guided` |

UI: **Help → Guided Evaluation**, **Executive Demo → Reset demo (reload pack)**.

---

## Inventory (target counts)

| Domain | Count |
|--------|------:|
| Business services | 25 |
| Applications | 350 |
| Servers | 1,500 |
| Databases | 280 |
| Kubernetes clusters | 150 |
| Cloud resources | 900 |
| Network devices | 120 |
| APIs | 40 |
| Business owners | 30 |
| Environments | Prod / UAT / DR |

Plus graph-core anchors (UPI, CBS, PG, Fraud, API GW, Oracle, Kafka, Redis, EKS/AKS, ALB, firewall, storage), drift events, discovery connectors, incidents, ITSM, security alerts, and 30-day executive trends.

---

## Guided evaluation (15 min)

1. Executive Home  
2. Business Service Health  
3. Discovery  
4. CMDB  
5. CMDB Drift  
6. Digital Twin  
7. Live Topology  
8. Banking360  
9. Security Center  
10. AI Copilot prompts  
11. Executive Report  

---

## Empty states

Customer-facing pages map `Internal server error` → guidance to load demo pack or connect Discovery. Empty tables offer **Load Illustrative Demo Data**, setup, docs, and guided evaluation CTAs.

---

## Migration

`database/migrations/048_ede_enterprise_demo.sql` — `ede_inventory_summary`, `ede_executive_daily`, `ede_guided_steps`.

---

## Known limitations

- Banking360 deep rail metrics still depend on compliance pack activation for some widgets; executive/CMDB/Twin/Topology/Drift/ITSM/Security are pack-driven.
- Topology API may still return empty graphs for non-seeded tenants (friendly empty state, not ISE).
- Bulk CI insert (~3.4k rows) can take several seconds on reset — expected for one-click reload.
- Dedicated demo login is separate from signup tenants; use **Load demo pack** on any admin tenant for evaluations.

---

## Quality gate

> If a Gartner analyst, Fortune 500 CIO, or enterprise customer evaluated OpsEdge360 today, would the product look like a mature enterprise platform even before connecting it to their own environment?

**Target answer after EDE load: yes** — with clear Illustrative Demo Data labeling.
