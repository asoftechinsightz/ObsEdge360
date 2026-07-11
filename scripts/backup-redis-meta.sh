#!/usr/bin/env bash
# Redis RDB/AOF metadata backup attestation (best-effort dump if redis-cli available)
set -euo pipefail
OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"
STAMP="$(date +%F-%H%M%S)"
FILE="$OUT_DIR/opsedge360-redis-$STAMP.meta.json"
CONTAINER="$(docker ps -qf name=redis | head -n1 || true)"
if [[ -n "$CONTAINER" ]]; then
  INFO=$(docker exec "$CONTAINER" redis-cli INFO persistence 2>/dev/null || echo "unavailable")
  python3 - <<PY
import json
open("$FILE","w").write(json.dumps({
  "target":"redis",
  "wave":"v1.0.0-wave6",
  "container":"$CONTAINER",
  "persistence":'''$INFO'''[:4000],
  "note":"Metadata snapshot; use redis BGSAVE + volume snapshot for full DR"
}, indent=2))
print("Wrote $FILE")
PY
else
  echo '{"target":"redis","status":"not_running","wave":"v1.0.0-wave6"}' > "$FILE"
fi
echo "REDIS_BACKUP_META_OK"
