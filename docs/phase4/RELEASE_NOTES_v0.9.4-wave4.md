# Release Notes — v0.9.4-wave4

**Phase 4 Wave 4 — Controlled remediation**

## Highlights

- Human approval gates for medium/high risk and any live execution
- Allowlisted live actions with controlled adapter
- Honest `executionMode` persistence (`dry_run` | `live`)
- Remediation catalog + audit events
- Low-risk dry-run remains executable without approval (compat)

## Ops

- Tag: `v0.9.4-wave4`
- Validation token: `P4_WAVE4_VALIDATION_OK`
- Migration: `031_controlled_remediation.sql`
- Optional: `REMEDIATION_LIVE_WEBHOOK_URL` for live webhook dispatch
