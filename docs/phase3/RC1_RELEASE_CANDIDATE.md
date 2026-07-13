# OpsEdge360 Enterprise Release Candidate (RC1)

**Status:** Pending post-deploy validation evidence  
**Date:** 2026-07-13  
**Branch:** `feature/commercial-launch-prep`  
**Build hash:** `27f50fb`  
**API version:** v1  
**Database migration tip:** `049_incident_workspace.sql`

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
| Twin | Postgres fallback when CMDB mesh empty/down |
| Security | MITRE mapping, evidence, timeline, related assets, remediation links |
| Network | Flow → topology/twin/incident/automation path |
| Migration | `049` + rollback script |

---

## Deployment

1. Bundle: `opsedge360-rc1.bundle` → `/tmp/opsedge360-latest.bundle`
2. `DEPLOY_BRANCH=feature/commercial-launch-prep bash scripts/vps-deploy-latest.sh`
3. Migrate runs inside deploy (`docker compose … migrate`) including **049**
4. Post-validate: `bash scripts/vps-rc1-validate.sh`

### Rollback

1. Redeploy previous bundle / prior SHA via same deploy script  
2. Optional DB: `database/migrations/049_incident_workspace_rollback.sql`  
3. Restore `.env` from `/root/opsedge360.env.pre-deploy-*` if needed  

---

## Exit criteria checklist

| Criterion | Status |
|-----------|--------|
| Production deployed | _fill after deploy_ |
| Migration 049 complete | _fill after validate_ |
| Twin populated (nodes > 0) | _fill after validate_ |
| Demo environment realistic | _fill after EDE load_ |
| Scenario 1 Payment Gateway | _fill after validate_ |
| Scenario 5 Security Incident | _fill after validate_ |
| Reports generated | _fill_ |
| Automation verified | _fill_ |
| Audit verified | _fill_ |
| Security verified | _fill_ |
| Network verified | _fill_ |
| No production P0 blockers | _fill_ |

---

## Known issues (accepted for RC1 if residual)

| ID | Issue | Severity |
|----|-------|----------|
| KI-1 | Word (.docx) export not shipped — PDF/XLSX/CSV/JSON only | P2 |
| KI-2 | Context menus not universal on all tables | P2 |
| KI-3 | Compliance evidence UI still partial | P2 |
| KI-4 | MITRE mapping is heuristic from finding type (not full ATT&CK engine) | P2 |

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
| Engineering | ☐ RC1 validated | |
| CPO | ☐ Approve RC1 · ☐ Hold | |
| Security | ☐ Accept residual risk | |
