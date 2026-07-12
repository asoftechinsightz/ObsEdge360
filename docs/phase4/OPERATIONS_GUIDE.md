# Operations Guide — RC1

## Backup

- Postgres: `scripts/backup-postgres.sh`
- Redis meta: `scripts/backup-redis-meta.sh`
- Certify: Admin Backup Certification

## Disaster recovery

- HA compose + failover drills (Wave 2/7)
- Restore scripts + restore certification UI
- Keep offsite copies of DB dumps and `.env`

## Monitoring the platform

- `/api/v1/metrics`, ops-health, Wave 7 soak/chaos (gated)
