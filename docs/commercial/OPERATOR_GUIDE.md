# Operator Guide (Commercial)

## Daily

```bash
curl -sk https://<api>/api/v1/health
docker compose -f docker-compose.prod.yml ps
# Review Security Center alerts / login history
```

## Weekly

```bash
bash scripts/backup-postgres.sh
bash scripts/backup-certify.sh   # if used
bash scripts/dr-validate.sh      # attestation / dry checks
```

Complete [docs/pilot/WEEKLY_HEALTH_REVIEW_TEMPLATE.md](../pilot/WEEKLY_HEALTH_REVIEW_TEMPLATE.md).

## Incidents

1. Health fail → check gateway, postgres, redis.  
2. Auth issues → Security Center; revoke sessions (`jti` invalidates JWT).  
3. Collect diagnostics: `bash scripts/diagnostics-bundle.sh`.  
4. Escalate via [SUPPORT_HANDBOOK.md](./SUPPORT_HANDBOOK.md).  

## Deeper references

- `docs/rc2/OPERATIONS_RUNBOOK.md`  
- `docs/Wave9/OperationsManual.md`  
- [PLATFORM_OBSERVABILITY.md](./PLATFORM_OBSERVABILITY.md)  
- [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md)
