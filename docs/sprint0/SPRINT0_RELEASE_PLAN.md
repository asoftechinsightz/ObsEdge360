# Sprint 0 Release Plan

## Branch Strategy

- **Development:** `feature/sprint0-enterprise-foundation`
- **Production:** `main` (LOCKED — no direct commits)
- **Merge:** PR only after full validation

## Release Phases

### Phase A — Foundation Packages (Week 1)
- shared-logger, agent-framework, shared-security, plugin-sdk
- Migration 015
- Unit tests

### Phase B — Services (Week 1–2)
- Discovery v2 connectors
- Scheduler service
- Config management service
- Topology engine
- Telemetry pipeline

### Phase C — Agents (Week 2)
- Platform agents (windows, linux, mac, docker, kubernetes)
- Agent config pull/push API

### Phase D — Validation (Week 2)
- npm install, lint, typecheck, test, build
- docker compose build
- SPRINT0_VALIDATION_REPORT.md

### Phase E — Staging Deploy (Post-approval)
- Apply migration 015 to staging PostgreSQL
- Deploy new services (scheduler:4011, config-management:4012)
- Gateway proxy routes (additive)
- Smoke tests against staging

### Phase F — Production (Requires approval)
- Maintenance window
- Migration 015 on `trinetra360` database
- Rolling deploy of updated services
- **No changes** to Nginx routing, SSL, Docker volume names, or migrations 001–014

## Rollback Plan

1. Revert to previous container images
2. Migration 015 tables are additive — no rollback SQL required for emergency
3. Disable new gateway routes via feature flag if needed

## Risk Matrix

| Risk | Mitigation |
|------|------------|
| DB migration failure | Test on staging; idempotent migration |
| Agent compatibility | host-agent unchanged; new agents opt-in |
| API breaking changes | All endpoints additive |
| Performance | Indexes on new tables; rate limiting |

## Sign-off Checklist

- [ ] All validation commands pass
- [ ] Documentation complete
- [ ] Security scan clean (CRITICAL/HIGH)
- [ ] Staging smoke tests pass
- [ ] Production change approval obtained
