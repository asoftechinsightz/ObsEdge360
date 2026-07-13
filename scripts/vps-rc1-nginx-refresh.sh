#!/bin/bash
set -euo pipefail
cd /opt/OpsEdge360

echo "=== current IPs ==="
docker inspect -f '{{.Name}} {{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' opsedge360-api-gateway-1 opsedge360-web-1 opsedge360-nginx-1

echo "=== recreate nginx to refresh upstream DNS ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d --no-deps --force-recreate nginx
sleep 8

echo "=== new nginx upstream resolve check ==="
docker exec opsedge360-nginx-1 getent hosts api-gateway || docker exec opsedge360-nginx-1 nslookup api-gateway || true
docker exec opsedge360-nginx-1 getent hosts web || true

echo "=== health after nginx recreate ==="
for i in 1 2 3 4 5 6; do
  code=$(curl -sk -o /dev/null -w '%{http_code}' https://api.observability360.asoftechinsightz.com/api/v1/health || true)
  echo "attempt=$i health=$code"
  if [ "$code" = "200" ]; then break; fi
  sleep 5
done
curl -sk -o /dev/null -w 'web=%{http_code}\n' https://observability360.asoftechinsightz.com/

echo "=== twin debug + RC1 validate ==="
sed -i 's/\r$//' /tmp/vps-rc1-twin-debug.sh /tmp/vps-rc1-validate.sh || true
bash /tmp/vps-rc1-twin-debug.sh || true
bash /tmp/vps-rc1-validate.sh
echo RC1_NGINX_FIX_DONE
