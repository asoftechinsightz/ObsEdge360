#!/usr/bin/env bash
# Validate commercial launch artifacts exist and SBOM generates.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0
check() {
  if [[ -f "$2" || -d "$2" ]]; then echo "PASS $1"; PASS=$((PASS+1)); else echo "FAIL $1 missing $2"; FAIL=$((FAIL+1)); fi
}

echo "=== Commercial launch validate ==="
check commercial_readme "$ROOT/docs/commercial/README.md"
check eval_pkg "$ROOT/docs/commercial/CUSTOMER_EVALUATION_PACKAGE.md"
check release_pkg "$ROOT/docs/commercial/PRODUCTION_RELEASE_PACKAGE.md"
check support "$ROOT/docs/commercial/SUPPORT_HANDBOOK.md"
check maint "$ROOT/docs/commercial/MAINTENANCE_UPGRADE_GUIDE.md"
check dr "$ROOT/docs/commercial/DISASTER_RECOVERY.md"
check checklist "$ROOT/docs/commercial/PRODUCTION_READINESS_CHECKLIST.md"
check roadmap "$ROOT/docs/commercial/PRODUCT_ROADMAP.md"
check pilot_docs "$ROOT/docs/pilot/README.md"
check rc3_docs "$ROOT/docs/rc3/README.md"
check package_script "$ROOT/scripts/package-commercial.sh"
check sbom_script "$ROOT/scripts/generate-sbom.sh"
check diag_script "$ROOT/scripts/diagnostics-bundle.sh"
check dr_script "$ROOT/scripts/dr-validate.sh"
check compose_prod "$ROOT/docker-compose.prod.yml"
check helm_chart "$ROOT/infra/helm/opsedge360/Chart.yaml"

bash "$ROOT/scripts/generate-sbom.sh" "$ROOT/docs/commercial/sbom.json"
[[ -f "$ROOT/docs/commercial/sbom.json" ]] && { echo "PASS sbom_generate"; PASS=$((PASS+1)); } || { echo "FAIL sbom_generate"; FAIL=$((FAIL+1)); }
bash "$ROOT/scripts/dr-validate.sh"
PASS=$((PASS+1))

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[[ "$FAIL" -eq 0 ]] || exit 1
echo COMMERCIAL_LAUNCH_VALIDATE_OK
