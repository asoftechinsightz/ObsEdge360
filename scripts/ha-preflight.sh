#!/usr/bin/env bash
# HA preflight — verifies Wave 2 artifacts exist (does not start multi-node).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0
check_file() {
  if [[ -f "$1" ]]; then echo "PASS file $1"; PASS=$((PASS+1)); else echo "FAIL missing $1"; FAIL=$((FAIL+1)); fi
}
check_file "$ROOT/docker-compose.ha.yml"
check_file "$ROOT/infra/redis/sentinel.conf"
check_file "$ROOT/infra/helm/opsedge360/values-ha.yaml"
check_file "$ROOT/infra/helm/opsedge360/templates/hpa-gateway.yaml"
check_file "$ROOT/infra/helm/opsedge360/templates/pdb-gateway.yaml"
check_file "$ROOT/infra/helm/opsedge360/templates/ingress.yaml"
check_file "$ROOT/database/migrations/034_high_availability.sql"
echo "=== ha-preflight pass=$PASS fail=$FAIL ==="
[[ "$FAIL" -eq 0 ]]
echo HA_PREFLIGHT_OK
