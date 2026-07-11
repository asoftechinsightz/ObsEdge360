#!/bin/bash
set -euo pipefail
cd /opt/OpsEdge360

echo "=== PRECHECK ==="
cp -a .env "/root/opsedge360.env.pre-deploy-$(date +%Y%m%d%H%M%S)"
ls -lh /var/backups/opsedge360-trinetra360-*.sql.gz | tail -2 || true
git log -1 --oneline

echo "=== FETCH BUNDLE ==="
git fetch /tmp/opsedge360-latest.bundle +feature/sprint0-enterprise-foundation:refs/remotes/bundle/latest
git reset --hard refs/remotes/bundle/latest
ENVBAK=$(ls -1t /root/opsedge360.env.pre-deploy-* | head -1)
cp -a "$ENVBAK" .env
# ensure authz on in production unless explicitly disabled
grep -q '^AUTHZ_ENFORCE=' .env || echo 'AUTHZ_ENFORCE=true' >> .env
grep -q '^AUDIT_L2_QUEUE=' .env || echo 'AUDIT_L2_QUEUE=true' >> .env
grep -q '^AUDIT_EMIT=' .env || echo 'AUDIT_EMIT=true' >> .env
if ! grep -q '^SECRETS_MASTER_KEY=' .env; then
  KEY=$(openssl rand -base64 32 | tr -d '\n')
  echo "SECRETS_MASTER_KEY=$KEY" >> .env
  echo "SECRETS_PROVIDER=local" >> .env
fi
grep -q '^SERVICE_AUTH_ENABLED=' .env || echo 'SERVICE_AUTH_ENABLED=true' >> .env
grep -q '^SERVICE_AUTH_REQUIRED=' .env || echo 'SERVICE_AUTH_REQUIRED=true' >> .env
grep -q '^MTLS_ENABLED=' .env || echo 'MTLS_ENABLED=true' >> .env
grep -q '^MTLS_REQUIRED=' .env || echo 'MTLS_REQUIRED=false' >> .env
grep -q '^MESH_AUTO_BOOTSTRAP=' .env || echo 'MESH_AUTO_BOOTSTRAP=true' >> .env
grep -q '^SPIFFE_TRUST_DOMAIN=' .env || echo 'SPIFFE_TRUST_DOMAIN=opsedge360.local' >> .env
grep -q '^CMDB_MTLS_URL=' .env || echo 'CMDB_MTLS_URL=https://cmdb:4443' >> .env
if ! grep -q '^SERVICE_JWT_SECRET=' .env; then
  # Prefer dedicated secret; fall back to JWT_SECRET value if present
  if grep -q '^JWT_SECRET=' .env; then
    JWTV=$(grep '^JWT_SECRET=' .env | head -1 | cut -d= -f2-)
    echo "SERVICE_JWT_SECRET=$JWTV" >> .env
  else
    echo "SERVICE_JWT_SECRET=$(openssl rand -base64 32 | tr -d '\n')" >> .env
  fi
fi
git log -1 --oneline
git branch --show-current

echo "=== VERIFY PORT BINDS ==="
grep -n '127.0.0.1:5432\|127.0.0.1:6379\|127.0.0.1:9092' docker-compose.yml || true
grep -n '127.0.0.1:4000' docker-compose.prod.yml || true

echo "=== BUILD (gateway + deps via images) ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod build api-gateway web discovery cmdb observability compliance transactions security

echo "=== MIGRATE (016+) ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod run --rm migrate

echo "=== RECREATE APP SERVICES (gateway first for mesh bootstrap) ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d --no-deps --force-recreate api-gateway
sleep 15
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d --no-deps --force-recreate \
  discovery cmdb observability compliance transactions security web nginx
# recreate gateway again so mTLS agent picks up materialized SVIDs after cmdb is up
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d --no-deps --force-recreate api-gateway
sleep 20

echo "=== SMOKE ==="
docker ps --filter name=opsedge360 --format 'table {{.Names}}\t{{.Status}}'
curl -sk https://api.observability360.asoftechinsightz.com/api/v1/health; echo
curl -sk -o /dev/null -w 'ready=%{http_code}\n' https://api.observability360.asoftechinsightz.com/api/v1/ready
curl -sk -o /dev/null -w 'live=%{http_code}\n' https://api.observability360.asoftechinsightz.com/api/v1/live
curl -sk -o /dev/null -w 'version=%{http_code}\n' https://api.observability360.asoftechinsightz.com/api/v1/version
curl -sk -o /dev/null -w 'metrics=%{http_code}\n' https://api.observability360.asoftechinsightz.com/api/v1/metrics
curl -sk -o /dev/null -w 'web=%{http_code}\n' https://observability360.asoftechinsightz.com/
curl -sk -o /dev/null -w 'topology_noauth=%{http_code}\n' https://api.observability360.asoftechinsightz.com/api/v1/cmdb/topology/application
curl -sk -o /dev/null -w 'refresh_noauth=%{http_code}\n' -X POST https://api.observability360.asoftechinsightz.com/api/v1/auth/refresh
ss -tlnp | grep -E '0\.0\.0\.0:(5432|6379|9092|4000)\s' && echo FAIL_public || echo PASS_no_public_dataplane
docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c 'SELECT 1 AS ok;'
echo DEPLOY_DONE
