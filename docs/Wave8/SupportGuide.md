# Wave 8 — Support Guide

## Collect before escalating

1. `GET /api/v1/health` JSON
2. `docker ps --filter name=opsedge360`
3. Gateway logs (last 200 lines)
4. Tenant ID, UTC time window, failing route/UI path
5. Recent change (deploy SHA / tag)

## Severity

| Sev | Definition | Response |
|-----|------------|----------|
| 1 | Platform down / data risk | Immediate on-call |
| 2 | Major feature impaired | ≤ 30 minutes |
| 3 | Workaround available | Business hours |
| Security | Suspected compromise | Security runbook + audit export |
