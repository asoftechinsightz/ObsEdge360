# OpsEdge360 — HA / DR smoke runbook

**Version:** 1.0.0  
**Scope:** Single-region active stack with optional Postgres replica readiness

GA supports **active-passive** recovery (restore from backup) and **gateway horizontal scale**. Full multi-region active-active is post-GA.

---

## Architecture (GA)

```
Internet → Nginx (TLS) → web (:3000)
                      ↘ api-gateway (:4000) → microservices
                                              ↘ PostgreSQL (primary)
                                              ↘ Redis
                                              ↘ Kafka (optional)
```

- **Stateless:** gateway, web, discovery, cmdb, observability, compliance, transactions  
- **Stateful:** PostgreSQL (required), Redis (cache), Kafka (events)

---

## Gateway HA (scale-out)

Run 2+ gateway replicas behind nginx `upstream`:

```nginx
upstream obs360_api {
    server api-gateway-1:4000;
    server api-gateway-2:4000;
}
```

Docker Compose example (manual second instance):

```bash
API_GATEWAY_PORT=4000 docker compose ... up -d api-gateway
# Scale via swarm/k8s or second compose project with different container name
```

Health check: `GET /api/v1/health` must return 200 on each replica.

---

## Postgres readiness (replica optional)

For GA, primary Postgres with daily backups is required.

Optional streaming replica (operator-managed):

1. Configure `primary_conninfo` on standby  
2. Point read-only analytics to replica (future)  
3. Promote replica on primary failure, update `POSTGRES_HOST`

Smoke does **not** require a live replica; it verifies primary connectivity and write/read.

---

## HA smoke test

```bash
npm run ha:smoke
# Against production:
OBS360_GATEWAY_URL=https://api.observability360.asoftechinsightz.com \
OBS360_WEB_URL=https://observability360.asoftechinsightz.com \
OBS360_TOKEN=<jwt> \
npm run ha:smoke
```

Checks:

1. Gateway health  
2. Web health  
3. Auth `/auth/me` with token  
4. CMDB write/read/delete (tenant isolation path)  
5. Platform config endpoint  
6. Concurrent gateway requests (burst)

---

## Failure drills

| Scenario | Expected | Drill |
|----------|----------|-------|
| Kill one gateway container | Nginx routes to remaining | `docker stop <gw>` then smoke |
| Restart Postgres | Services reconnect via pool | `docker restart <postgres>` then smoke |
| Full node loss | Restore from backup | [BACKUP-RESTORE.md](./BACKUP-RESTORE.md) |

---

## Success criteria (GA)

- [ ] `npm run smoke` PASS  
- [ ] `npm run ha:smoke` PASS with token  
- [ ] Backup script produces non-empty dump  
- [ ] Restore drill completed within RTO (2h)  
- [ ] Pen-test checklist signed ([PENTEST-REMEDIATION.md](./PENTEST-REMEDIATION.md))
