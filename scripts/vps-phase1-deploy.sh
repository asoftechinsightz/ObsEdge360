#!/bin/bash
set -euo pipefail
cd /opt/OpsEdge360

echo "=== PRECHECK ==="
cp -a .env /root/opsedge360.env.pre-phase1-$(date +%Y%m%d%H%M%S)
ls -lh /var/backups/opsedge360-trinetra360-*.sql.gz | tail -2
docker ps --filter name=opsedge360-nginx --format '{{.Names}} {{.Status}}'

echo "=== FETCH PHASE1 BUNDLE ==="
git fetch /tmp/opsedge360-phase1.bundle feature/sprint0-enterprise-foundation:feature/sprint0-enterprise-foundation
git checkout -f feature/sprint0-enterprise-foundation
# restore production env (never overwrite with example)
ENVBAK=$(ls -1t /root/opsedge360.env.pre-phase1-* | head -1)
cp -a "$ENVBAK" .env
git rev-parse --short HEAD
git branch --show-current

echo "=== VERIFY PORT BINDS ==="
grep -n '127.0.0.1:5432\|127.0.0.1:6379\|127.0.0.1:9092' docker-compose.yml
grep -n '127.0.0.1:4000' docker-compose.prod.yml

echo "=== BUILD (no cache soft) ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod build api-gateway web discovery cmdb observability compliance transactions security

echo "=== RECREATE APP SERVICES (keep volumes) ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d --no-deps --force-recreate \
  discovery cmdb observability compliance transactions security api-gateway web nginx

# ensure migrate runs if needed (one-shot)
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d migrate || true

sleep 15
echo "=== POST SMOKE ==="
docker ps --filter name=opsedge360 --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
curl -sk https://api.observability360.asoftechinsightz.com/api/v1/health; echo
curl -sk -o /dev/null -w 'ready=%{http_code}\n' https://api.observability360.asoftechinsightz.com/api/v1/ready
curl -sk -o /dev/null -w 'live=%{http_code}\n' https://api.observability360.asoftechinsightz.com/api/v1/live
curl -sk -o /dev/null -w 'version=%{http_code}\n' https://api.observability360.asoftechinsightz.com/api/v1/version
curl -sk -o /dev/null -w 'metrics=%{http_code}\n' https://api.observability360.asoftechinsightz.com/api/v1/metrics
curl -sk -o /dev/null -w 'web=%{http_code}\n' https://observability360.asoftechinsightz.com/
ss -tlnp | grep -E '0\.0\.0\.0:(5432|6379|9092|4000)\s' && echo FAIL_public || echo PASS_no_public_dataplane
docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c 'SELECT 1 AS ok;'
echo DEPLOY_DONE