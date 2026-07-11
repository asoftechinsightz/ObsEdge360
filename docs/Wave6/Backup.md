# Wave 6 — Backup

## Host backups (authoritative)

| Target | Script / method |
|--------|-----------------|
| PostgreSQL | `scripts/backup-postgres.sh` (existing) |
| Redis | `scripts/backup-redis-meta.sh` (metadata snapshot) |
| Kafka | Operator/host topic dump — attest via certification API |
| Configuration | Git + `.env` backup (pre-deploy copies under `/root/opsedge360.env.pre-deploy-*`) |

## Scheduling

`POST /admin/deployment/backup/schedules` records cron, retention, encryption flag, target (`postgresql|redis|kafka|configuration|full`).

Execution remains on the host/cron; the API is the control-plane registry.

## Certification

`scripts/backup-certify.sh <artifact>` prints SHA-256 + size.

`POST /admin/deployment/backup/certify` stores:

- `checksum_sha256`
- `integrity_ok`
- `retention_until`
- report JSON (encryption note, integrity)

UI: `/admin/backup-certification`

## Encryption

Backup artifacts should be written encrypted at rest (gzip + disk encryption / age/gpg per site runbook). Certification report records `encrypted: true` when operators attest encrypted storage.
