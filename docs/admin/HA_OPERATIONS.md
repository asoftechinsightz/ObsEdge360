# HA Operations Guide

## Preflight

```bash
bash scripts/ha-preflight.sh
```

## Enable compose HA overlay

```bash
export GATEWAY_REPLICAS=2 HA_MULTI_NODE=true HA_MODE=active
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.ha.yml --profile ha up -d
```

## Rolling upgrade

1. `POST /api/v1/admin/upgrades/precheck`
2. Deploy new images with rolling recreate (maxUnavailable 0 in Helm)
3. Smoke health/ready/live
4. Record upgrade in Admin → Upgrade
5. Rollback: redeploy previous image tag + restore DB if migration unsafe

## Backup verification

1. Run `scripts/backup-postgres.sh`
2. `POST /api/v1/admin/backups/verify` with integrity attestation
3. Periodically restore to scratch DB and set `restoreVerified=true`

## Failover drills

Record drills via `POST /api/v1/admin/failover` — does not mutate infrastructure by itself.
