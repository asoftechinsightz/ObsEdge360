#!/bin/bash
set -euo pipefail
cd /opt/OpsEdge360
git fetch /tmp/opsedge360-latest.bundle '+feature/commercial-launch-prep:refs/remotes/bundle/latest'
git reset --hard refs/remotes/bundle/latest
ENVBAK=$(ls -1t /root/opsedge360.env.pre-deploy-* | head -1)
cp -a "$ENVBAK" .env
echo "SHA=$(git rev-parse HEAD)"
echo "subject=$(git log -1 --oneline)"
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod build api-gateway web
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d --no-deps --force-recreate api-gateway web
# Nginx caches upstream IPs — recreate after gateway/web so public HTTPS is not stuck on 502
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d --no-deps --force-recreate nginx
sleep 20
for i in 1 2 3 4 5 6 7 8; do
  code=$(curl -sk -o /dev/null -w '%{http_code}' https://api.observability360.asoftechinsightz.com/api/v1/health || true)
  echo "health_attempt=$i code=$code"
  if [ "$code" = "200" ]; then break; fi
  sleep 5
done
curl -sk https://api.observability360.asoftechinsightz.com/api/v1/health; echo
sed -i 's/\r$//' /tmp/vps-rc1-twin-debug.sh || true
bash /tmp/vps-rc1-twin-debug.sh || true
bash /tmp/vps-rc1-validate.sh
echo RC1_HOTFIX_DONE
