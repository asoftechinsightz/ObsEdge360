#!/usr/bin/env bash
# Collect a support diagnostics archive (no secrets).
# Usage: ./scripts/diagnostics-bundle.sh [OUT_DIR]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/dist/diagnostics}"
STAMP="$(date +%Y%m%d%H%M%S)"
DIR="$OUT/opsedge360-diagnostics-$STAMP"
mkdir -p "$DIR"
API="${API_BASE:-https://api.observability360.asoftechinsightz.com/api/v1}"

{
  echo "product=OpsEdge360"
  echo "stamp=$STAMP"
  echo "host=$(hostname 2>/dev/null || echo unknown)"
} > "$DIR/manifest-notes.txt"

(cd "$ROOT" && git rev-parse HEAD > "$DIR/git-head.txt" 2>/dev/null) || echo "nogit" > "$DIR/git-head.txt"
(cd "$ROOT" && git status -sb > "$DIR/git-status.txt" 2>/dev/null) || true
(cd "$ROOT" && git log -5 --oneline > "$DIR/git-log.txt" 2>/dev/null) || true

docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' > "$DIR/docker-ps.txt" 2>/dev/null || echo "docker unavailable" > "$DIR/docker-ps.txt"
(cd "$ROOT" && docker compose -f docker-compose.prod.yml ps > "$DIR/compose-ps.txt" 2>/dev/null) || true

curl -sk "$API/health" -o "$DIR/health.json" 2>/dev/null || echo '{"error":"health unreachable"}' > "$DIR/health.json"
curl -sk -o "$DIR/ready.txt" -w '%{http_code}' "$API/ready" 2>/dev/null || echo fail > "$DIR/ready.txt"
curl -sk "$API/version" -o "$DIR/version.json" 2>/dev/null || true

docker logs --tail 200 opsedge360-api-gateway-1 > "$DIR/gateway-logs-tail.txt" 2>/dev/null || echo "no gateway logs" > "$DIR/gateway-logs-tail.txt"

df -h > "$DIR/disk.txt" 2>/dev/null || true
uptime > "$DIR/uptime.txt" 2>/dev/null || true

# Env key names only
if [[ -f "$ROOT/.env" ]]; then
  grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$ROOT/.env" | cut -d= -f1 | sort -u > "$DIR/env-keys.txt" || true
else
  echo "no .env in ROOT" > "$DIR/env-keys.txt"
fi

ARCHIVE="$OUT/opsedge360-diagnostics-$STAMP.tar.gz"
tar -C "$OUT" -czf "$ARCHIVE" "$(basename "$DIR")"
rm -rf "$DIR"
echo "DIAGNOSTICS_OK $ARCHIVE"
