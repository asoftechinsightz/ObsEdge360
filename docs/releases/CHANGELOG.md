# OpsEdge360 — Changelog

## [1.0.0] — 2026-07-12

### Added
- Phase 5 Waves 1–9 enterprise foundation
- GA control plane and validation gate `P5_GA_VALIDATION_OK`

### Notes
- Additive migrations through `041_wave9_ga.sql`
- No intentional breaking `/api/v1` changes from prior waves

## [1.0.0-phase2] — unreleased

### Added
- `APP_ENV` runtime planes + `platform/environment` API
- `042_phase2_enterprise_maturity.sql` (synthetics, feature flags, demo orgs, ITSM foundation, industry framework)
- Synthetic monitors API `/synthetics/*` (Phase A)
- Demo compose overlay + seed script
- Environment banner, command palette, grouped AdminNav
- Outbound notification kill-switch when `APP_ENV=demo|uat`

## Prior

See root `CHANGELOG.md` and `docs/phase5/PHASE5_IMPLEMENTATION_WAVES.md`.
