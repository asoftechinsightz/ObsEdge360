#!/bin/bash
set -euo pipefail
cd /opt/OpsEdge360
ENVBAK=$(ls -1t /root/opsedge360.env.pre-phase1-* | head -1)
git fetch /tmp/opsedge360-phase1.bundle +feature/sprint0-enterprise-foundation:refs/remotes/bundle/phase1
git reset --hard refs/remotes/bundle/phase1
cp -a "$ENVBAK" .env
git log -1 --oneline
grep -n opsedge360 apps/web/Dockerfile | head -5

echo "=== BUILD ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod build api-gateway web discovery cmdb observability compliance transactions security

echo "=== UP ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d --no-deps --force-recreate \
  discovery cmdb observability compliance transactions security api-gateway web nginx
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d migrate || true
sleep 20

echo "=== SMOKE ==="
docker ps --filter name=opsedge360 --format 'table {{.Names}}\t{{.Status}}'
curl -sk https://api.observability360.asoftechinsightz.com/api/v1/health; echo
curl -sk -o /dev/null -w 'ready=%{http_code}\n' https://api.observability360.asoftechinsightz.com/api/v1/ready
curl -sk -o /dev/null -w 'live=%{http_code}\n' https://api.observability360.asoftechinsightz.com/api/v1/live
curl -sk -o /dev/null -w 'version=%{http_code}\n' https://api.observability360.asoftechinsightz.com/api/v1/version
curl -sk -o /dev/null -w 'metrics=%{http_code}\n' https://api.observability360.asoftechinsightz.com/api/v1/metrics
curl -sk -o /dev/null -w 'web=%{http_code}\n' https://observability360.asoftechinsightz.com/
ss -tlnp | grep -E '0\.0\.0\.0:(5432|6379|9092|4000)\s' && echo FAIL_public || echo PASS_no_public_dataplane
docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c 'SELECT 1 AS ok;'
echo DEPLOY_DONE
