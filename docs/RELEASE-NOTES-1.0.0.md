# OpsEdge360 v1.0.0 — GA Release Notes

**Release date:** 4 July 2026  
**Codename:** OpsEdge360 (standalone product)  
**Repository:** `OpsEdge360/`

---

## Summary

OpsEdge360 1.0.0 is the first generally available release of AsoftechInsightz’s **standalone** enterprise observability platform. It is **not** merged into LeadEdge360 or RetailEdge360.

---

## Product capabilities

| Area | Highlights |
|------|------------|
| **Identity** | Standalone signup/login, JWT, tenant isolation |
| **Discovery** | Connectors, agents, schedules, notifications |
| **CMDB** | CI CRUD, relationships, import/export, stats |
| **Topology** | Digital twin graph, blast-radius impact analysis |
| **Infra monitoring** | Prometheus scrape targets, host metrics, alert rules & channels |
| **APM** | OTLP metrics/logs/traces, service map, log search |
| **Transactions** | Flow maps, OTLP correlation, SLA/SLO dashboards |
| **Banking360** | BFSI pack, RBI/PCI controls, UPI/NEFT/IMPS templates |
| **AI Copilot** | Shell panel, RCA workflow, recommendations |
| **Deploy** | SaaS / Hybrid / On-prem via `DEPLOYMENT_MODE` |

---

## Security (GA baseline)

- Production rejects weak `JWT_SECRET`
- Auth rate limiting on login/signup
- Security headers (HSTS in production)
- Explicit `CORS_ORIGINS` required for production
- DTO whitelist validation
- See [PENTEST-REMEDIATION.md](./PENTEST-REMEDIATION.md)

---

## Operations

- [DEPLOY-VPS.md](./DEPLOY-VPS.md) — production deploy
- [BACKUP-RESTORE.md](./BACKUP-RESTORE.md) — backup/restore drill
- [HA-RUNBOOK.md](./HA-RUNBOOK.md) — HA smoke and failure drills
- [PRODUCT_IDENTITY.md](./PRODUCT_IDENTITY.md) — product boundaries

---

## Upgrade / install

```bash
cd OpsEdge360
cp .env.prod.example .env   # set secrets
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d --build
npm run db:migrate
npm run smoke
npm run ha:smoke            # with OBS360_TOKEN
```

---

## Known limitations

- Auth rate limit is in-memory (resets on gateway restart)
- OpenSearch log search is optional (`OPENSEARCH_URL`)
- AI agents Python service is optional; copilot has rule-based fallback
- Postgres streaming replica is operator-managed (not auto-provisioned in compose)

---

## Tagging

```bash
git tag -a v1.0.0 -m "OpsEdge360 GA 1.0.0"
git push origin v1.0.0
```

---

## Sprint history (GA path)

S0 foundation (Phases 1–4) → S1 identity/deploy → S2 discovery → S3 CMDB → S4 topology → S5 infra → S6 APM → S7 transactions → S8 Banking360 → S9 copilot → **S10 GA**
