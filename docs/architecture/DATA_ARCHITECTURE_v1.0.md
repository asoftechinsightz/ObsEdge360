# Data Architecture v1.0

**Document ID:** OE360-DATA-1.0  
**Version:** 1.0  
**Status:** FROZEN  
**Effective:** 2026-07-10  

---

## 1. System of record

| Store | Role |
|-------|------|
| PostgreSQL database **`trinetra360`** | Primary OLTP / platform data |
| Redis | Cache / ephemeral (auth/session roadmap) |
| Kafka | Async events via event-bus patterns |

OpenSearch and graph DB options are **not** baseline runtime requirements for v1.0.

## 2. Migration policy

1. Schema changes **only** via new numbered migrations.  
2. Migrations **001–014** are immutable production history.  
3. Migration **015+** additive for Sprint 0 / later features.  
4. Never edit applied historical files.  
5. Runner: `database/migrations/run.js` (as deployed).

## 3. Tenancy data

- `tenant_id` (or equivalent) on tenant-scoped entities.  
- Hard enforcement and RLS strategy: Phase 2 (ADR-011).  
- Shared/platform rows must be explicitly modeled.

## 4. Major data domains (logical)

| Domain | Examples |
|--------|----------|
| Identity / RBAC | users, roles, permissions (enforcement Phase 2) |
| CMDB | CIs, relationships, topology materializations |
| Discovery | agents, configs, discovery results |
| Observability | pipeline sources, telemetry metadata |
| Compliance | frameworks, rules, evaluation results |
| Audit | Phase 2 append-oriented audit events (ADR-013) |
| Packs | enablement metadata (Phase 5) |

## 5. Backup & restore

- Logical dumps of `trinetra360` required for production.  
- Procedure: ops docs / `BACKUP-RESTORE` guidance.  
- PRR must verify backup freshness and restore drill/dry-run.

## 6. Data classification (summary)

| Class | Examples | Handling |
|-------|----------|----------|
| Secret | JWT keys, DB URLs, agent keys | Env/secrets mgr; never in git |
| Confidential | tenant operational data | Tenant isolation; least privilege |
| Internal | metrics, non-sensitive configs | Standard controls |
| Public | marketing site content | N/A to API data plane |

## Related

`ARCHITECTURE_BASELINE_v1.0.md` · `docs/governance/DATABASE_STANDARDS.md` · ADR-011 · ADR-013  
