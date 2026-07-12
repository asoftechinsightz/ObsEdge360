# OpsEdge360 — Database Review

**Assessment date:** 2026-07-12  
**Engine:** PostgreSQL (`trinetra360` / production naming)  
**Migrations:** 40 files (`001`–`041`, no `002`) via `database/migrations/run.js`

---

## Domain map

| Domain | Migrations | Notes |
|--------|------------|-------|
| Core CMDB / tenants / users | 001, 006 | Foundation |
| Phase feature expansions | 003–005 | Transactions, OT/security, packs/HA/FedRAMP |
| Discovery / agents / monitoring | 007–012 | Prometheus, APM/OTLP, Banking360 |
| Enterprise foundation | 013–021 | SSO, RBAC, audit, secrets, trust mesh, sec-obs |
| Telemetry / UA / topology / ops intel | 022–027 | Collectors, agents, dashboards |
| AI / AIOps / KG | 028–032 | LLM, correlation, predictive, remediation, KG |
| Phase 5 Waves 1–9 | 033–041 | Admin, HA, governance, automation, integrations, deploy, cert, RC, GA |

---

## Strengths

- **Additive-only** migration culture (Wave gates check table existence)  
- Clear domain separation across waves  
- Tenant columns widely present on multi-tenant entities  
- GA/RC/certification metadata first-class (`ga_*`, RC profiles, certification suites)  
- JSONB used for flexible evidence/manifests without schema thrash  

---

## Risks & gaps

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| Single primary DB for all domains | Medium | Keep now; plan read replicas / schema partitioning later |
| No dedicated Demo database | High (program) | Phase 2: `opsedge360_demo` + migrate path |
| Neo4j / OpenSearch / Mongo alongside PG | Medium | Document ownership boundaries; avoid dual-writes without contracts |
| JSONB-heavy AI/ops tables | Medium | Add indexes for hot query paths as load grows |
| Missing migration 002 | Low | Document gap; do not renumber |
| Backup cert scripts vs logical PITR | Medium | Document RPO/RTO; verify restore drills (Wave 6/7) |
| Multi-tenant row-level enforcement | Medium | App-layer today; consider RLS for highest-sensitivity tables later |

---

## Hot tables (operational)

- `configuration_items`, topology/drift tables  
- OTLP / prometheus / host_metrics (volume risk)  
- `audit_*`, `governance_audit_events`  
- `automation_*`, `ops_remediation_*`  
- `ga_regression_runs`, certification run tables  

**Volume guidance:** Telemetry retention policies exist (`telemetry_*` retention); ensure production retention jobs are scheduled and monitored.

---

## Migration discipline (keep)

1. Never edit applied migrations  
2. New work → next number (`042_…`) only when schema required  
3. Prefer nullable additive columns / new tables  
4. Seed data must be idempotent (`WHERE NOT EXISTS`)  
5. Demo schema changes must not break prod migrator  

---

## Phase 2 database implications

| Need | Approach |
|------|----------|
| Demo isolation | Separate DB name + connection string; same migrations |
| Demo seed volume (“thousands of records”) | Batch seeders with industry tags; truncate/refresh job |
| Production untouched | Distinct credentials, backups, and audit stream |

No schema change is required merely to *document* this assessment.
