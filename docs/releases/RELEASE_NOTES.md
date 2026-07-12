# OpsEdge360 — Release Notes

## v1.0.0 — General Availability (2026-07-12)

Enterprise foundation GA. Production validated with `P5_GA_VALIDATION_OK`.

### Highlights
- Unified ops console: discovery, CMDB, topology, observability, AIOps, security, compliance
- Enterprise admin: automation, integrations, HA/backup, certification, RC/GA control planes
- Security: RBAC/ABAC, secrets, service identity / mTLS, dual-layer audit
- Packaging: Compose, Helm (gateway/web), air-gap helpers, SBOM-lite

### Upgrade
From `v1.0.0-rc1` / Wave 7+: pull release tip, run migrations (through 041), recreate gateway/web, validate health.

### Support
See `docs/Wave9/SupportMatrix.md` and `docs/Wave9/VersionPolicy.md`.

## Phase 2 (enterprise maturity) — in progress

- Separate prod/demo/dev/local data planes (`APP_ENV`)
- Synthetic monitoring Phase A (HTTP/DNS/SSL/TCP)
- Demo organizations & refresh tooling
- ITSM foundation tables + industry pack framework
- UX: environment banner, command palette, grouped admin nav
