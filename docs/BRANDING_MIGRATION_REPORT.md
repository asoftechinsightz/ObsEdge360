<!-- Generated Phase 0 — 2026-07-06 — OpsEdge360 -->

# Branding Migration Report

## Locked

| Item | Value |
|------|-------|
| Product | OpsEdge360 |
| Domain | observability360.asoftechinsightz.com |
| DB name | trinetra360 |
| Volume names | Unchanged |

## Migrated

- Root and workspace package names → `@opsedge360/*`
- UI strings → OpsEdge360
- Scripts `obs360-*` → `opsedge360-*`
- Agent binary → `opsedge360-agent`

## Intentional legacy

- DB/user defaults (`trinetra`, `trinetra360`)
- nginx upstream names (`obs360_*`)
- OpenAPI filename
- Helm chart path `infra/helm/trinetra360`

See `docs/archive/LEGACY_NAMES.md`.
