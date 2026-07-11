# Wave 8 — Pilot Guide

## Deployment checklist

Loaded in `pilot_checklists` (type `deployment`) and mirrored in Admin RC APIs.

1. Confirm rollback media contains `v1.0.0-wave7`.
2. Backup DB + `.env`.
3. Install per [InstallationGuide.md](./InstallationGuide.md).
4. Apply migrations through 040.
5. Smoke health and Admin login.

## Acceptance checklist

AuthN/Z, dashboards, CMDB/topology, backup certification, Wave 7 certification overview.

## Rollback plan

See checklist type `rollback` and [UpgradeGuide.md](./UpgradeGuide.md).

## Support & escalation

See [SupportGuide.md](./SupportGuide.md).
