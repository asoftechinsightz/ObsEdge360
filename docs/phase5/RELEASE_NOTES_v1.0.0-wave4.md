# Release Notes — v1.0.0-wave4

**Phase 5 Wave 4 — Controlled Automation & Workflow Engine**

## Highlights

- Durable multi-step workflow engine (branch, parallel, timeout, retry, compensation, rollback, resume)
- Policy framework: manual_only, approval_required, maintenance_window, auto_execute (sim/dry_run only), read_only
- Approval queue: single / multi-level / emergency / expiration + audit
- Global emergency stop, pause, resume, cancel queued
- Simulation mode with predicted changes, dependency impact, duration, rollback preview
- Versioned enterprise runbook catalog
- Immutable automation history with search/export
- Admin Center automation pages

## Known limitations

- Live mode records controlled intent; does not auto-invoke external remediator adapters in Wave 4
- No fully autonomous production execution (by design)
- Visual workflow designer is form/JSON oriented (not a full canvas editor)
- Prometheus metrics exposed as dashboard hints

## Ops

- Tag: `v1.0.0-wave4`
- Validation: `P5_WAVE4_VALIDATION_OK`
- Migration: `036_controlled_automation.sql`
- Feature tip SHA: `85b9e8fc`

## Not claimed

- Enterprise GA · `P5_GA_VALIDATION_OK` · final `v1.0.0`
