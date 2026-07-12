# Environment Setup — Production / Demo / Dev / Local

## Logical databases

| Plane | `APP_ENV` | Database name | Notes |
|-------|-----------|---------------|-------|
| Production | `production` | `opsedge360_prod` | Live customers; alias may be `trinetra360` on existing VPS |
| Demo | `demo` | `opsedge360_demo` | Sales/training; outbound disabled |
| Development | `development` | `opsedge360_dev` | Shared eng |
| Local | `local` | `opsedge360_local` | Laptop defaults |
| UAT | `uat` | `opsedge360_uat` | Outbound disabled |
| Staging | `staging` | `opsedge360_staging` | Pre-prod |

`DEPLOYMENT_MODE` (`saas|hybrid|onprem`) remains **topology** and is independent of `APP_ENV`.

## Separation checklist

- [ ] Distinct Postgres instance or at least distinct database + credentials
- [ ] Distinct `JWT_SECRET` / `SERVICE_JWT_SECRET` / `SECRETS_MASTER_KEY`
- [ ] Distinct Redis (demo: `redis-demo`)
- [ ] Distinct notification channels / API keys
- [ ] Distinct backup schedules and storage paths
- [ ] `OUTBOUND_DISABLED=true` on demo/UAT
- [ ] UI banner via `/api/v1/platform/environment`

## Demo bring-up

```bash
cp .env.demo.example .env.demo
# set DEMO_POSTGRES_PASSWORD and secrets
docker compose -f docker-compose.yml -f docker-compose.demo.yml --profile demo up -d postgres-demo redis-demo
# migrate against demo DB
POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=5433 POSTGRES_USER=opsedge_demo POSTGRES_DB=opsedge360_demo \
  POSTGRES_PASSWORD=... node database/migrations/run.js
bash scripts/phase2-demo-seed.sh
```

Point a demo gateway stack at demo Postgres with `APP_ENV=demo`.

## Production

Keep existing VPS path. Set `APP_ENV=production`. Do **not** run `phase2-demo-seed.sh` against production.

## Validation

`bash scripts/vps-p2-validate.sh` → `P2_ENTERPRISE_MATURITY_VALIDATION_OK`
