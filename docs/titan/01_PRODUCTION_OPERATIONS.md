# 01 — Workstream 1: Production Operations

**Goal:** Operate OpsEdge360 like a product customers can stake SLAs on.

## Capabilities (use existing first)

| Need | Existing surface / doc |
|------|------------------------|
| Production monitoring | `/admin/ops-health`, `/admin/health`, `/admin/cvp/monitoring`, `docs/commercial/PLATFORM_OBSERVABILITY.md` |
| SLA monitoring | Executive Home SLA trends, `/reports`, synthetics |
| Backup verification | `/admin/backup`, `/admin/backup-verify`, `/admin/backup-certification` |
| Upgrade validation | `/admin/upgrade`, `/admin/upgrade-status`, `docs/commercial/MAINTENANCE_UPGRADE_GUIDE.md` |
| Disaster recovery drills | `docs/commercial/DISASTER_RECOVERY.md`, `scripts/dr-validate.sh` |
| Capacity planning | `/admin/capacity`, `/admin/storage`, `/admin/quotas` |
| Release health | `/admin/system/ga`, RC pages (Debug), `docs/commercial/RELEASE_NOTES.md` |

## TITAN operating checklist

| Cadence | Action | Owner |
|---------|--------|-------|
| Daily | Review ops-health + open Sev incidents | Support / SRE |
| Weekly | Backup verify sample + capacity glance | Platform |
| Monthly | DR tabletop or restore drill (document evidence) | Platform |
| Per release | Upgrade validation in staging → prod | Release mgr |
| Per pilot go-live | Release health + SLA baseline captured in CVP | CS + Platform |

## Artifacts to attach per customer

- SLA baseline (availability target, measurement window)  
- Last successful backup verification timestamp  
- Last DR drill date + result  
- Capacity headroom notes  

Store customer-specific notes in CVP pilot record + evidence template.
