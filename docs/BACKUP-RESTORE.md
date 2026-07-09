# OpsEdge360 — Backup & restore runbook

**Version:** 1.0.0  
**RPO target:** 24 hours (daily backup)  
**RTO target:** 2 hours (single-node restore)

---

## What to back up

| Component | Method | Frequency |
|-----------|--------|-----------|
| PostgreSQL (`trinetra360`) | `pg_dump` | Daily |
| `.env` / secrets | Encrypted copy off-box | On change |
| Nginx TLS certs | Certbot renew + copy | Weekly |
| Optional: Neo4j / OpenSearch | Vendor snapshot | If `full` profile used |

Redis and Kafka are ephemeral caches/buses — not required for restore.

---

## Backup (Linux VPS)

```bash
cd /opt/observability360/OpsEdge360
chmod +x scripts/backup-postgres.sh
./scripts/backup-postgres.sh /var/backups/obs360
```

Cron (02:00 daily):

```cron
0 2 * * * /opt/observability360/OpsEdge360/scripts/backup-postgres.sh /var/backups/obs360 >> /var/log/opsedge360-backup.log 2>&1
```

Keep at least **14 days** of dumps. Copy weekly to off-site storage (S3, another region).

---

## Backup (Windows / local Docker)

```powershell
cd D:\AsoftechInsightz_Project\OpsEdge360
.\scripts\backup-postgres.ps1 -OutDir .\backups
```

---

## Restore drill

1. Stop app services (keep Postgres if restoring in place):

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod stop web api-gateway discovery cmdb observability compliance transactions security
```

2. Restore database:

```bash
./scripts/restore-postgres.sh /var/backups/obs360/opsedge360-YYYY-MM-DD.sql.gz
```

3. Start services and migrate (idempotent):

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d
npm run db:migrate
npm run smoke
```

4. Sign in and verify:
   - `/dashboard` loads
   - `/cmdb` shows CIs
   - `/banking360` pack state
   - Create a test CI and confirm it persists

Record drill date, duration, and issues in the ops log.

---

## Verification queries

```sql
SELECT COUNT(*) FROM tenants;
SELECT COUNT(*) FROM configuration_items;
SELECT COUNT(*) FROM business_transactions;
SELECT COUNT(*) FROM users WHERE password_hash IS NOT NULL;
```

---

## Failure modes

| Symptom | Action |
|---------|--------|
| Dump file corrupt | Use previous day's dump |
| Partial restore | Drop DB and restore full dump |
| Auth fails after restore | Confirm `JWT_SECRET` matches pre-backup env |
