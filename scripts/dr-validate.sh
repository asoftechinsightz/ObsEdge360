#!/usr/bin/env bash
# Non-destructive DR / backup attestation for commercial readiness.
# Usage: ./scripts/dr-validate.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0
check() {
  local name="$1"
  if [[ "$2" == "1" ]]; then echo "PASS $name"; PASS=$((PASS+1)); else echo "FAIL $name"; FAIL=$((FAIL+1)); fi
}

echo "=== OpsEdge360 DR validate (non-destructive) ==="
[[ -f "$ROOT/scripts/backup-postgres.sh" ]] && check backup_postgres_script 1 || check backup_postgres_script 0
[[ -f "$ROOT/scripts/restore-postgres.sh" ]] && check restore_postgres_script 1 || check restore_postgres_script 0
[[ -f "$ROOT/scripts/backup-redis-meta.sh" ]] && check backup_redis_script 1 || check backup_redis_script 0
[[ -f "$ROOT/scripts/backup-certify.sh" ]] && check backup_certify_script 1 || check backup_certify_script 0
[[ -f "$ROOT/docs/commercial/DISASTER_RECOVERY.md" ]] && check dr_doc 1 || check dr_doc 0
[[ -f "$ROOT/docs/commercial/MAINTENANCE_UPGRADE_GUIDE.md" ]] && check maint_doc 1 || check maint_doc 0

if command -v docker >/dev/null && docker compose version >/dev/null 2>&1; then
  if (cd "$ROOT" && docker compose -f docker-compose.prod.yml config >/dev/null 2>&1); then
    check compose_prod_config 1
  else
    check compose_prod_config 0
  fi
else
  echo "SKIP compose_prod_config (docker compose unavailable)"
fi

# Optional: run backup if OPS_DR_RUN_BACKUP=1 and postgres container present
if [[ "${OPS_DR_RUN_BACKUP:-}" == "1" ]]; then
  if docker ps --format '{{.Names}}' | grep -q postgres; then
    if bash "$ROOT/scripts/backup-postgres.sh"; then check backup_exec 1; else check backup_exec 0; fi
  else
    echo "SKIP backup_exec (no postgres container)"
  fi
else
  echo "SKIP backup_exec (set OPS_DR_RUN_BACKUP=1 to execute)"
fi

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[[ "$FAIL" -eq 0 ]] || exit 1
echo DR_VALIDATE_OK
