# Wave 6 — Runbook

## Pre-deploy

1. Confirm baseline tag `v1.0.0-wave5` still validates if rolling back.
2. Snapshot PostgreSQL (`backup-postgres.sh`) and copy `.env`.
3. Announce change window.

## Deploy (VPS)

```bash
# laptop
git bundle create /tmp/opsedge360-latest.bundle feature/wave6-enterprise-deployment
scp -i ~/.ssh/asoftech_vps /tmp/opsedge360-latest.bundle root@187.127.179.138:/tmp/
ssh -i ~/.ssh/asoftech_vps root@187.127.179.138 \
  'DEPLOY_BRANCH=feature/wave6-enterprise-deployment bash /opt/OpsEdge360/scripts/vps-deploy-latest.sh'
```

If nginx returns 502 after gateway recreate, force-recreate nginx once.

## Post-deploy checks

1. `curl -sk https://api.../api/v1/health`
2. Confirm migration: table `secret_rotation_jobs` exists.
3. Run `bash scripts/vps-p5-wave6-validate.sh` → `P5_WAVE6_VALIDATION_OK`
4. Spot-check Admin UI: System Security, Ops Health, Deployment.

## Backup certification drill

```bash
./scripts/backup-postgres.sh
./scripts/backup-certify.sh /var/backups/opsedge360-*.sql.gz
# POST checksum to /admin/deployment/backup/certify
```

## Restore drill (non-prod clone preferred)

1. Restore to isolated instance with `restore-postgres.sh`.
2. Validate health + sample queries.
3. Attest via `/admin/deployment/restore/certify`.

## Rollback

1. Restore prior `.env` backup.
2. `git reset --hard` to previous production SHA / tag `v1.0.0-wave5`.
3. Rebuild/recreate services; migrations are additive — do not drop 038 tables on rollback unless EAB-approved.
