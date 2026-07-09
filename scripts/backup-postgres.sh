#!/usr/bin/env bash
# OpsEdge360 PostgreSQL backup
# Usage: ./scripts/backup-postgres.sh [/var/backups/obs360]

set -euo pipefail

OUT_DIR="${1:-./backups}"
STAMP="$(date +%F)"
FILE="${OUT_DIR}/opsedge360-${STAMP}.sql.gz"

mkdir -p "$OUT_DIR"

CONTAINER="$(docker ps -qf name=postgres | head -n1)"
if [[ -z "$CONTAINER" ]]; then
  echo "No running postgres container found"
  exit 1
fi

USER="${POSTGRES_USER:-trinetra}"
DB="${POSTGRES_DB:-trinetra360}"

echo "Backing up $DB from $CONTAINER -> $FILE"
docker exec "$CONTAINER" pg_dump -U "$USER" "$DB" | gzip > "$FILE"

# Retain 14 days
find "$OUT_DIR" -name 'opsedge360-*.sql.gz' -mtime +14 -delete 2>/dev/null || true

echo "Backup complete: $FILE ($(du -h "$FILE" | cut -f1))"
