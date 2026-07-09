#!/usr/bin/env bash
# OpsEdge360 — apply production hotfixes after rsync to VPS
# Usage: ./scripts/apply-vps-patches.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[opsedge360] Applying VPS patches in $ROOT"

# Ensure prod env exists
if [[ ! -f .env ]]; then
  echo "ERROR: .env missing — copy from .env.prod.example and configure secrets"
  exit 1
fi

# Rebuild and restart production stack (domain/volumes unchanged)
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod build
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d

echo "[opsedge360] Waiting for api-gateway health..."
for i in {1..30}; do
  if curl -sf http://127.0.0.1:4000/api/v1/health >/dev/null 2>&1; then
    echo "[opsedge360] API gateway healthy"
    break
  fi
  sleep 2
done

docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
echo "[opsedge360] Patches applied. Verify https://observability360.asoftechinsightz.com"
