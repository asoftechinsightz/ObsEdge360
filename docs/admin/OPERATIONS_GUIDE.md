# Operations Guide — Enterprise Administration

## Admin Center

UI: `/admin` (admin role required)  
APIs: `/api/v1/admin/*`

## Backup

```bash
./scripts/backup-postgres.sh /var/backups/opsedge360
```

Record in Admin → Backup.

## Restore

```bash
./scripts/restore-postgres.sh /var/backups/opsedge360/opsedge360-YYYY-MM-DD.sql.gz
```

Follow Admin → Restore checklist. Validate health after recreate.

## Upgrade (On-Prem)

```bash
./scripts/upgrade-onprem.sh /tmp/opsedge360-latest.bundle
```

Record in Admin → Upgrade.

## Emergency stop

Admin → Automation Policies → Emergency Stop. Production mode cannot be created without approval requirement.
