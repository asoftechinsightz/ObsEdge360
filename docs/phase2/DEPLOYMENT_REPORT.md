# Phase 2 — Deployment Report

## Scope delivered

| Priority | Status |
|----------|--------|
| P0 Env separation | Compose demo overlay, APP_ENV, docs, kill-switch |
| P2 Release baseline | Tag `v1.0.0` @ `4222b45` + `docs/releases/*` |
| P3A Synthetics | HTTP/REST/DNS/SSL/TCP API + UI |
| P4 Demo | Orgs table + seed script + personas |
| P5 UX | Banner, Ctrl+K palette, grouped AdminNav |
| P6 Platform | feature_flags table + APIs |
| P7 ITSM | Foundation tables + summary API |
| P8 Industry | Framework rows (planned packs) |

## Production evidence (2026-07-12)

| Field | Value |
|-------|-------|
| Branch | `feature/phase2-enterprise-maturity` |
| Production SHA | `52f79c21bfa733e68dc2c7951469808c0d46eaeb` |
| Migration | `042_phase2_enterprise_maturity.sql` applied |
| Health | 200 |
| Validation | `P2_ENTERPRISE_MATURITY_VALIDATION_OK` (16/16) |
| GA tag | `v1.0.0` → `4222b45ac00f8081650465195eb21de84221a16e` |
| APP_ENV on VPS | `production` (prod DB name unchanged / aliased) |

## Migration

`042_phase2_enterprise_maturity.sql`

## Rollback

1. Redeploy previous tip `4222b45` (pure GA).  
2. Do **not** drop 042 tables unless explicitly approved (additive).  
3. Unset misconfigured `APP_ENV=demo` on prod.

## Risks

| Risk | Mitigation |
|------|------------|
| Seeding prod by mistake | Seed script refuses production APP_ENV |
| Demo shares prod DB | Use `docker-compose.demo.yml` + separate credentials |
| Synthetic noise | Alerts only when alert_rules exist |
