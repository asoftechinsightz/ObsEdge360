# Release Notes — v1.0.0-wave3

**Phase 5 Wave 3 — Platform Operations & Governance**

## Highlights

- Tenant quota enforcement (soft/hard limits + warnings) across agents, CMDB, dashboards, AI, RAG, KG, API, discovery, storage, concurrent users
- Platform capacity & storage monitoring with snapshots and projected exhaustion hints
- Expanded Enterprise Admin settings (general, platform, AI, notifications — Slack/Teams config only)
- Password & session policies (complexity, history, lockout, timeouts, concurrent sessions, forced logout)
- License status with expiration/grace and entitlements — non-disruptive to active workloads
- Platform health scores (overall, capacity, storage, security, license, quota utilization) + recommendations
- Governance audit trail for admin/policy/license/quota/config changes with filter/export
- Admin Center pages for platform ops governance

## Known limitations

- Soft/hard quota evaluate API is live; not every write path is hard-gated yet
- Slack/Teams = configuration only (no live delivery in this wave)
- Prometheus metrics exposed as hints on platform-health; full scrape suite deferred
- Screenshots not bundled in repo artifacts

## Ops

- Tag: `v1.0.0-wave3`
- Validation: `P5_WAVE3_VALIDATION_OK`
- Migration: `035_platform_governance.sql`
- Feature tip SHA: `9e1eade5`

## Not claimed

- Enterprise GA · `P5_GA_VALIDATION_OK` · final `v1.0.0`
