#!/bin/bash
# Sprint 2 RC2 — deploy Unified Observability to production VPS
set -euo pipefail
cd /opt/OpsEdge360
git fetch /tmp/opsedge360-latest.bundle '+feature/commercial-launch-prep:refs/remotes/bundle/latest'
git reset --hard refs/remotes/bundle/latest
ENVBAK=$(ls -1t /root/opsedge360.env.pre-deploy-* | head -1)
cp -a "$ENVBAK" .env
echo "SHA=$(git rev-parse HEAD)"
echo "subject=$(git log -1 --oneline)"
# Rebuild gateway (observe façade + shared-security) and web (observability hub)
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod build api-gateway web
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d --no-deps --force-recreate api-gateway web
# Stale nginx upstream IPs cause 502 after recreate
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d --no-deps --force-recreate nginx
sleep 20
for i in 1 2 3 4 5 6 7 8; do
  code=$(curl -sk -o /dev/null -w '%{http_code}' https://api.observability360.asoftechinsightz.com/api/v1/health || true)
  echo "health_attempt=$i code=$code"
  if [ "$code" = "200" ]; then break; fi
  sleep 5
done
sed -i 's/\r$//' /tmp/vps-s2-rc2-validate.sh /tmp/vps-s2-rc2-perf.py || true
bash /tmp/vps-s2-rc2-validate.sh
echo S2_RC2_DEPLOY_VALIDATE_DONE
