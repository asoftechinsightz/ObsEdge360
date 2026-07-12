# Phase 2 — Validation

**Script:** `scripts/vps-p2-validate.sh`  
**Token:** `P2_ENTERPRISE_MATURITY_VALIDATION_OK`

## Checks

- Health
- `/platform/environment` + `/platform/config`
- Migration 042 (`synthetic_monitors`)
- Feature flags / industry framework / ITSM summary
- Synthetics create + run
- GA API compatibility
- Docs/packaging files present

## Security notes

- Outbound notifications blocked when `isOutboundDisabled()`
- Demo seed refuses `APP_ENV=production`

## Performance notes

- Synthetic checks are on-demand in Phase A (scheduler can reuse interval_seconds later)
- Prefer indexes already on `synthetic_results(monitor_id, checked_at DESC)`
