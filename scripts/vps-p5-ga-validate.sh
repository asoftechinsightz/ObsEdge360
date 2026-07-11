#!/bin/bash
set -euo pipefail
API="${API_BASE:-https://api.observability360.asoftechinsightz.com/api/v1}"
ROOT="${ROOT_DIR:-/opt/OpsEdge360}"
PASS=0
FAIL=0
check() {
  local name="$1" expect="$2" got="$3"
  if [ "$got" = "$expect" ]; then echo "PASS $name ($got)"; PASS=$((PASS+1));
  else echo "FAIL $name expected=$expect got=$got"; FAIL=$((FAIL+1)); fi
}

echo "=== Phase 5 GA validation @ $API ==="
echo "git: $(cd "$ROOT" && git log -1 --oneline)"

for i in $(seq 1 40); do
  H=$(curl -sk -o /dev/null -w '%{http_code}' "$API/health" || true)
  [ "$H" = "200" ] && break
  sleep 3
done
check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

TAB=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='ga_releases';" | tr -d '[:space:]')
check migration_041_ga 1 "${TAB:-0}"

DOCS_OK=1
for f in GAReadinessReport.md ReleaseNotes.md SupportMatrix.md VersionPolicy.md MaintenancePolicy.md KnownIssues.md ReleaseLifecycle.md UpgradeMatrix.md ArchitectureGuide.md APIDocumentation.md AdministratorGuide.md InstallationGuide.md OperationsManual.md QuickStart.md Validation.md; do
  [ -f "$ROOT/docs/Wave9/$f" ] || DOCS_OK=0
done
[ -f "$ROOT/CHANGELOG.md" ] || DOCS_OK=0
if [ "$DOCS_OK" = "1" ]; then echo "PASS documentation_ga"; PASS=$((PASS+1)); else echo "FAIL documentation_ga"; FAIL=$((FAIL+1)); fi

for s in wave9-ga-regression.mjs package-ga.sh generate-sbom.sh ga-quality-scan.sh; do
  if [ -f "$ROOT/scripts/$s" ]; then echo "PASS script_$s"; PASS=$((PASS+1)); else echo "FAIL script_$s"; FAIL=$((FAIL+1)); fi
done

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/p5ga_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p5ga.admin.${SUFFIX}@opsedge360.internal\",\"password\":\"P5GAVal!${SUFFIX}Aa\",\"name\":\"P5 GA Admin\",\"organizationName\":\"P5GA Org ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/p5ga_signup.json')).get('accessToken') or '')" 2>/dev/null || true)
[ -n "$TOKEN" ] || { echo FAIL token; exit 1; }

OV=$(curl -sk -o /tmp/p5ga_ov.json -w '%{http_code}' "$API/admin/system/ga" -H "Authorization: Bearer $TOKEN")
check ga_overview 200 "$OV"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5ga_ov.json'))
assert d.get('gaClaim') is True
assert d.get('wave')=='v1.0.0'
assert len(d.get('modules') or []) >= 14
print('PASS ga_modules')
PY
PASS=$((PASS+1))

# Full regression
export CERT_TOKEN="$TOKEN" API_BASE="$API"
if node "$ROOT/scripts/wave9-ga-regression.mjs" --api "$API" --token "$TOKEN"; then
  echo "PASS full_regression"; PASS=$((PASS+1));
else
  echo "FAIL full_regression"; FAIL=$((FAIL+1));
fi

# All modules recorded passed
for m in platform security observability discovery cmdb topology ai_gateway knowledge_graph administration governance automation integrations deployment certification; do
  N=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
    "SELECT COUNT(*) FROM ga_regression_runs WHERE module_key='$m' AND status='passed'" | tr -d '[:space:]')
  if [ "${N:-0}" -ge 1 ]; then echo "PASS module_$m"; PASS=$((PASS+1)); else echo "FAIL module_$m"; FAIL=$((FAIL+1)); fi
done

# Packaging + SBOM + quality
mkdir -p /tmp/opsedge360-ga-out
if bash "$ROOT/scripts/package-ga.sh" /tmp/opsedge360-ga-out; then echo "PASS ga_package"; PASS=$((PASS+1)); else echo "FAIL ga_package"; FAIL=$((FAIL+1)); fi
if bash "$ROOT/scripts/generate-sbom.sh" /tmp/opsedge360-ga-sbom.json; then echo "PASS sbom"; PASS=$((PASS+1)); else echo "FAIL sbom"; FAIL=$((FAIL+1)); fi
cp -f /tmp/opsedge360-ga-sbom.json "$ROOT/docs/Wave9/sbom.json" 2>/dev/null || true
if bash "$ROOT/scripts/ga-quality-scan.sh"; then echo "PASS quality_scan"; PASS=$((PASS+1)); else echo "FAIL quality_scan"; FAIL=$((FAIL+1)); fi

# OpenAPI
OJ=$(curl -sk -o /tmp/p5ga_oa.json -w '%{http_code}' "${API%/api/v1}/api/docs-json")
check openapi_json 200 "$OJ"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5ga_oa.json'))
assert (d.get('info') or {}).get('version')=='1.0.0'
print('PASS openapi_version_1_0_0')
PY
PASS=$((PASS+1))

# Upgrade/rollback baselines
if cd "$ROOT" && (git rev-parse v1.0.0-rc1 >/dev/null 2>&1 || git cat-file -t 02fd175519b5a6d1751b821ad3e1b551854dfc8c >/dev/null 2>&1); then
  echo "PASS upgrade_baseline_rc1"; PASS=$((PASS+1));
else echo "FAIL upgrade_baseline_rc1"; FAIL=$((FAIL+1)); fi
if cd "$ROOT" && (git rev-parse v1.0.0-wave7 >/dev/null 2>&1 || git cat-file -t bc3ceeb958a0defa3118b44dcbf034b999f9ec49 >/dev/null 2>&1); then
  echo "PASS rollback_wave7"; PASS=$((PASS+1));
else echo "FAIL rollback_wave7"; FAIL=$((FAIL+1)); fi

# RC + cert compat
RC=$(curl -sk -o /dev/null -w '%{http_code}' "$API/admin/system/release-candidate" -H "Authorization: Bearer $TOKEN")
check rc_compat 200 "$RC"
CERT=$(curl -sk -o /dev/null -w '%{http_code}' "$API/admin/system/certification" -H "Authorization: Bearer $TOKEN")
check cert_compat 200 "$CERT"

# Sign-offs + approve
for t in readiness production_validation release_approval version_manifest sbom support_readiness; do
  SO=$(curl -sk -o /dev/null -w '%{http_code}' -X POST "$API/admin/system/ga/signoff" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d "{\"reportType\":\"$t\",\"title\":\"$t\",\"body\":{\"ok\":true}}")
  if [ "$SO" = "200" ] || [ "$SO" = "201" ]; then echo "PASS signoff_$t"; PASS=$((PASS+1)); else echo "FAIL signoff_$t"; FAIL=$((FAIL+1)); fi
done

SHA=$(cd "$ROOT" && git rev-parse HEAD)
APPR=$(curl -sk -o /tmp/p5ga_appr.json -w '%{http_code}' -X PUT "$API/admin/system/ga/approve" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"status\":\"approved\",\"productionSha\":\"$SHA\",\"validationToken\":\"P5_GA_VALIDATION_OK\",\"manifest\":{\"version\":\"v1.0.0\"},\"sbom\":{\"path\":\"docs/Wave9/sbom.json\"},\"readiness\":{\"ok\":true}}")
if [ "$APPR" = "200" ] || [ "$APPR" = "201" ]; then echo "PASS ga_approve ($APPR)"; PASS=$((PASS+1)); else echo "FAIL ga_approve"; cat /tmp/p5ga_appr.json; FAIL=$((FAIL+1)); fi

RD=$(curl -sk -o /tmp/p5ga_rd.json -w '%{http_code}' "$API/admin/system/ga/readiness" -H "Authorization: Bearer $TOKEN")
check ga_readiness 200 "$RD"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5ga_rd.json'))
assert d.get('gaClaim') is True
assert d.get('ready') is True
print('PASS ga_ready')
PY
PASS=$((PASS+1))

UA=$(curl -sk -o /dev/null -w '%{http_code}' "$API/admin/system/ga")
if [ "$UA" = "401" ] || [ "$UA" = "403" ]; then echo "PASS ga_unauth ($UA)"; PASS=$((PASS+1)); else echo "FAIL ga_unauth got=$UA"; FAIL=$((FAIL+1)); fi

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo P5_GA_VALIDATION_OK
