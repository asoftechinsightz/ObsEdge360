# OpsEdge360 Enterprise Release Candidate (RC1)

**Status:** Engineering validated — awaiting CPO sign-off  
**Date:** 2026-07-13  
**Branch:** `feature/commercial-launch-prep`  
**Build hash:** `ef8183f37a79b1b184a3ec0f72a49d756960b5cd`  
**API version:** v1  
**Database migration tip:** `049_incident_workspace.sql`  
**Evidence dir (prod):** `/tmp/opsedge360-rc1-evidence`

---

## Purpose

Close production readiness blockers so OpsEdge360 can be marked **Enterprise Release Candidate (RC1)**.

Platform Configuration APIs remain blocked until RC1 is approved.

---

## What RC1 includes

| Area | Contents |
|------|----------|
| Wave 1–2 | Aggregated executive dashboard |
| P0 | Search, report export, security findings, agent approvals, action workflows |
| P1 | Incident Workspace lifecycle (assign→close+report) |
| Twin | Postgres fallback when CMDB mesh empty/down; prefers relationship-participating CIs |
| Security | MITRE mapping, evidence, timeline, related assets, remediation links |
| Network | Flow → topology/twin/incident/automation path |
| Migration | `049` + rollback script |

---

## Production evidence (2026-07-13)

| Check | Result |
|-------|--------|
| SHA on VPS | `ef8183f` |
| Health / ready / live / web | **200** |
| Migration 049 columns | `owner_id`, `priority`, `business_impact`, `workspace_state`, `closure_report_id` present |
| EDE pack load | Asoftech Global Bank demo — services/apps/servers/DB/K8s inventory loaded |
| Twin graph | **54 nodes · 59 edges** (`postgres-fallback`) |
| Relationships in DB | **242** |
| Search `/search?q=payment` | **200** |
| Incident workspace | **200** — Scenario 1 RCA / verify / close-and-report |
| Security dashboard / posture | **200** |
| Network flows | **200** |
| Executive dashboard | **200** |
| Audit (`ops_incident_activity`) | **6+** rows |

### Deploy notes

- After `api-gateway` / `web` recreate, **nginx must be recreated** (or reloaded) so upstream DNS refreshes; otherwise public HTTPS stays on **502** with stale container IPs.
- Hotfix script: `scripts/vps-rc1-hotfix-redeploy.sh` (includes nginx recreate).
- Nginx refresh helper: `scripts/vps-rc1-nginx-refresh.sh`.

---

## Deployment

1. Bundle: `opsedge360-latest.bundle` → `/tmp/opsedge360-latest.bundle`
2. `DEPLOY_BRANCH=feature/commercial-launch-prep bash scripts/vps-deploy-latest.sh`  
   or hotfix: `bash /tmp/vps-rc1-hotfix-redeploy.sh`
3. Migrate including **049** (verify columns if migrate container skips new files; apply `database/migrations/049_incident_workspace.sql` explicitly if needed)
4. Post-validate: `bash scripts/vps-rc1-validate.sh`

### Rollback

1. Redeploy previous bundle / prior SHA via same deploy script  
2. Optional DB: `database/migrations/049_incident_workspace_rollback.sql`  
3. Restore `.env` from `/root/opsedge360.env.pre-deploy-*` if needed  

---

## Exit criteria checklist

| Criterion | Status |
|-----------|--------|
| Production deployed | **PASS** (`ef8183f`) |
| Migration 049 complete | **PASS** |
| Twin populated (nodes > 0) | **PASS** (54 nodes) |
| Twin edges visible | **PASS** (59 edges) |
| Demo environment realistic | **PASS** (EDE pack) |
| Scenario 1 Payment Gateway | **PASS** (workspace lifecycle + RCA + close-and-report) |
| Scenario 5 Security Incident | **PASS*** (security APIs 200; investigate path + findings surfaces; MITRE in Security UI) |
| Reports generated | **PASS** (close-and-report) |
| Automation verified | **PASS** (dry-run remediation request in Scenario 1) |
| Audit verified | **PASS** (`ops_incident_activity`) |
| Security verified | **PASS** (dashboard/posture/fraud/anomalies/SIEM) |
| Network verified | **PASS** (flows + topology) |
| No production P0 blockers | **PASS** |

\*Scenario 5 MITRE/evidence/timeline/related-assets are implemented in Security Workspace UI over live finding APIs; full ATT&CK engine is accepted residual (KI-4).

---

## Known issues (accepted for RC1 if residual)

| ID | Issue | Severity |
|----|-------|----------|
| KI-1 | Word (.docx) export not shipped — PDF/XLSX/CSV/JSON only | P2 |
| KI-2 | Context menus not universal on all tables | P2 |
| KI-3 | Compliance evidence UI still partial | P2 |
| KI-4 | MITRE mapping is heuristic from finding type (not full ATT&CK engine) | P2 |
| KI-5 | Nginx upstream IP sticky after force-recreate — recreate nginx after gateway/web | Ops note |

---

## Documents

| Doc | Path |
|-----|------|
| Production Readiness Report | [PRODUCTION_READINESS_REPORT.md](./PRODUCTION_READINESS_REPORT.md) |
| P0 status | [P0_FUNCTIONAL_STATUS.md](./P0_FUNCTIONAL_STATUS.md) |
| P1 workflow | [P1_INCIDENT_WORKFLOW.md](./P1_INCIDENT_WORKFLOW.md) |
| Migration | `database/migrations/049_incident_workspace.sql` |
| Rollback | `database/migrations/049_incident_workspace_rollback.sql` |
| Validate script | `scripts/vps-rc1-validate.sh` |

---

## Sign-off

| Role | Decision | Date |
|------|----------|------|
| Engineering | ☑ RC1 validated (prod evidence 2026-07-13) | 2026-07-13 |
| CPO | ☐ Approve RC1 · ☐ Hold | |
| Security | ☐ Accept residual risk (KI-1–KI-4) | |

**Platform Configuration APIs, MCP, and AI enhancements remain blocked until CPO RC1 approval.**
