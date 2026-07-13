#!/bin/bash
set -euo pipefail
echo "=== containers ==="
docker ps --format '{{.Names}} {{.Status}} {{.Ports}}' | grep -E 'nginx|gateway|web' || true

echo "=== local gateway ==="
curl -sk -o /dev/null -w 'health=%{http_code}\n' http://127.0.0.1:4000/api/v1/health
curl -sk -o /dev/null -w 'ready=%{http_code}\n' http://127.0.0.1:4000/api/v1/ready

echo "=== nginx containers ==="
NGINX=$(docker ps -q --filter name=nginx | head -1 || true)
if [ -n "${NGINX:-}" ]; then
  echo "nginx_id=$NGINX"
  docker logs --tail 40 "$NGINX" 2>&1 || true
  docker exec "$NGINX" sh -c 'nginx -T 2>/dev/null' | grep -E 'server_name|proxy_pass|listen|upstream' | head -60 || true
else
  echo "no docker nginx; checking host nginx"
  systemctl is-active nginx || true
  nginx -T 2>/dev/null | grep -E 'observability|proxy_pass|server_name' | head -60 || true
  ls -la /etc/nginx/sites-enabled/ 2>/dev/null || true
  ls -la /etc/nginx/conf.d/ 2>/dev/null || true
fi

echo "=== find observability nginx conf ==="
grep -RIl 'observability360' /etc/nginx /opt/OpsEdge360 2>/dev/null | head -20 || true

echo "=== ext after diagnose ==="
curl -sk -o /dev/null -w 'ext_health=%{http_code}\n' https://api.observability360.asoftechinsightz.com/api/v1/health
curl -sk -o /dev/null -w 'ext_web=%{http_code}\n' https://observability360.asoftechinsightz.com/
