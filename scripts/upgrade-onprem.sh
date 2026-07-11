#!/usr/bin/env bash
# On-prem upgrade helper — fetch bundle ref, migrate, recreate core services.
# Usage: ./scripts/upgrade-onprem.sh /tmp/opsedge360-latest.bundle
set -euo pipefail
BUNDLE="${1:-/tmp/opsedge360-latest.bundle}"
ROOT="${OPSEDGE_ROOT:-/opt/OpsEdge360}"

if [[ ! -f "$BUNDLE" ]]; then
  echo "Bundle not found: $BUNDLE"
  exit 1
fi

cd "$ROOT"
cp -a .env "/root/opsedge360.env.pre-upgrade-$(date +%Y%m%d%H%M%S)"
git fetch "$BUNDLE" +feature/sprint0-enterprise-foundation:refs/remotes/bundle/latest
git reset --hard refs/remotes/bundle/latest
ENVBAK=$(ls -1t /root/opsedge360.env.pre-upgrade-* | head -1)
cp -a "$ENVBAK" .env

docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod build api-gateway web observability
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod run --rm migrate
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d --no-deps --force-recreate api-gateway observability web nginx
sleep 15
curl -sk -o /dev/null -w 'health=%{http_code}\n' https://api.observability360.asoftechinsightz.com/api/v1/health || true
echo UPGRADE_ONPREM_DONE
