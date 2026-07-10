#!/bin/bash
set -euo pipefail
cd /opt/OpsEdge360
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d --force-recreate --no-deps postgres redis kafka api-gateway
sleep 10
echo "=== PORTS ==="
ss -tlnp | grep -E ':(5432|6379|9092|4000|80|443) ' || true
echo "=== HEALTH ==="
curl -sk -o /dev/null -w 'health=%{http_code}\n' https://api.observability360.asoftechinsightz.com/api/v1/health
curl -sk -o /dev/null -w 'web=%{http_code}\n' https://observability360.asoftechinsightz.com/
docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c 'SELECT 1 AS ok;'
docker ps --filter name=opsedge360 --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo "=== PUBLIC BIND CHECK ==="
if ss -tlnp | grep -E '0\.0\.0\.0:(5432|6379|9092|4000)\s' >/dev/null; then echo 'FAIL_still_public'; else echo 'PASS_no_public_dataplane'; fi
if ss -tlnp | grep -E '127\.0\.0\.1:(5432|6379|9092|4000)\s' >/dev/null; then echo 'PASS_localhost_binds'; else echo 'WARN_no_localhost_listen'; fi