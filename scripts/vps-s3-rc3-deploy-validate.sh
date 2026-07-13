#!/bin/bash
# Sprint 3 RC3 — deploy Twin BSI to production
set -euo pipefail
cd /opt/OpsEdge360
git fetch /tmp/opsedge360-latest.bundle '+feature/commercial-launch-prep:refs/remotes/bundle/latest'
git reset --hard refs/remotes/bundle/latest
ENVBAK=$(ls -1t /root/opsedge360.env.pre-deploy-* 2>/dev/null | head -1 || true)
if [ -n "${ENVBAK:-}" ] && [ -f "$ENVBAK" ]; then
  cp -a "$ENVBAK" .env
  echo "restored_env=$ENVBAK"
else
  echo "WARN: no env backup found; keeping existing .env"
fi
echo "SHA=$(git rev-parse HEAD)"
echo "subject=$(git log -1 --oneline)"

echo "=== migrate 050 twin bsi ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod run --rm migrate

echo "=== rebuild api-gateway + web ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod build api-gateway web
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d --no-deps --force-recreate api-gateway web
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d --no-deps --force-recreate nginx
sleep 20
for i in 1 2 3 4 5 6 7 8; do
  code=$(curl -sk -o /dev/null -w '%{http_code}' https://api.observability360.asoftechinsightz.com/api/v1/health || true)
  echo "health_attempt=$i code=$code"
  if [ "$code" = "200" ]; then break; fi
  sleep 5
done

sed -i 's/\r$//' /tmp/vps-s3-rc3-validate.sh /tmp/vps-s3-rc3-perf.py /tmp/vps-s3-rc3-screenshots.mjs /tmp/vps-s3-rc3-demo-journey.py || true
bash /tmp/vps-s3-rc3-validate.sh
echo S3_RC3_DEPLOY_VALIDATE_DONE
