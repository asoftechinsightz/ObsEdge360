#!/usr/bin/env bash
# OpsEdge360 PostgreSQL restore
# Usage: ./scripts/restore-postgres.sh /var/backups/obs360/opsedge360-YYYY-MM-DD.sql.gz

set -euo pipefail

DUMP="${1:-}"
if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
  echo "Usage: $0 <dump.sql.gz>"
  exit 1
fi

CONTAINER="$(docker ps -qf name=postgres | head -n1)"
if [[ -z "$CONTAINER" ]]; then
  echo "No running postgres container found"
  exit 1
fi

USER="${POSTGRES_USER:-trinetra}"
DB="${POSTGRES_DB:-trinetra360}"

echo "WARNING: This replaces database $DB"
read -r -p "Type RESTORE to continue: " confirm
if [[ "$confirm" != "RESTORE" ]]; then
  echo "Aborted"
  exit 1
fi

echo "Dropping and recreating $DB..."
docker exec -i "$CONTAINER" psql -U "$USER" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB' AND pid <> pg_backend_pid();" || true
docker exec -i "$CONTAINER" psql -U "$USER" -d postgres -c "DROP DATABASE IF EXISTS $DB;"
docker exec -i "$CONTAINER" psql -U "$USER" -d postgres -c "CREATE DATABASE $DB OWNER $USER;"

echo "Restoring from $DUMP..."
gunzip -c "$DUMP" | docker exec -i "$CONTAINER" psql -U "$USER" -d "$DB"

echo "Restore complete. Run: npm run db:migrate && npm run smoke"
