# Disaster Recovery

## Scope

| Component | Backup | Restore |
|-----------|--------|---------|
| PostgreSQL | `scripts/backup-postgres.sh` / `.ps1` | `scripts/restore-postgres.sh` |
| Redis meta | `scripts/backup-redis-meta.sh` | Documented in Wave ops (ephemeral cache acceptable for many pilots) |
| App/config | Git SHA + preserved `.env` + compose/helm values | Redeploy SHA |

## Backup

```bash
bash scripts/backup-postgres.sh
bash scripts/backup-certify.sh   # optional integrity helper
```

Store dumps off-box. Record SHA of running release with each backup.

## Restore (destructive)

```bash
# On disposable / DR environment only
bash scripts/restore-postgres.sh /path/to/dump.sql.gz
# Confirm prompt: type RESTORE
npm run db:migrate   # or compose migrate
curl -sk https://<api>/api/v1/health
```

## DR validate (non-destructive attestation)

```bash
bash scripts/dr-validate.sh
```

Checks scripts/docs presence, compose config, optional backup dry-run flags. Does **not** wipe production DB.

## RTO / RPO guidance (pilot commercial)

| Metric | Guidance |
|--------|----------|
| RPO | Last successful backup (daily minimum) |
| RTO | 1–4 hours for Compose restore on prepared host |

Contractual DR SLAs require customer-specific annex.
