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

echo "=== Phase 5 Wave 7 validation @ $API ==="
echo "git: $(cd "$ROOT" && git log -1 --oneline)"

# Wait for API plane (post-deploy / post-drill)
for i in $(seq 1 40); do
  H=$(curl -sk -o /dev/null -w '%{http_code}' "$API/health" || true)
  if [ "$H" = "200" ]; then break; fi
  sleep 3
done

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

TAB=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='certification_runs';" | tr -d '[:space:]')
check migration_039_runs 1 "${TAB:-0}"

REP=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='certification_reports';" | tr -d '[:space:]')
check migration_039_reports 1 "${REP:-0}"

if [ -d "$ROOT/docs/Wave7" ] && [ -f "$ROOT/docs/Wave7/Certification.md" ] && [ -f "$ROOT/docs/Wave7/Validation.md" ]; then
  echo "PASS documentation_wave7"; PASS=$((PASS+1));
else
  echo "FAIL documentation_wave7"; FAIL=$((FAIL+1));
fi

if [ -f "$ROOT/scripts/wave7-certify.mjs" ] && [ -f "$ROOT/scripts/wave7-chaos-ha.sh" ]; then
  echo "PASS certification_scripts"; PASS=$((PASS+1));
else
  echo "FAIL certification_scripts"; FAIL=$((FAIL+1));
fi

if [ -f "$ROOT/infra/helm/opsedge360/values-production.yaml" ] && [ -f "$ROOT/docker-compose.prod.yml" ]; then
  echo "PASS kubernetes_docker_packaging"; PASS=$((PASS+1));
else
  echo "FAIL kubernetes_docker_packaging"; FAIL=$((FAIL+1));
fi

if [ -f "$ROOT/scripts/airgap-package.sh" ] && [ -f "$ROOT/scripts/upgrade-onprem.sh" ]; then
  echo "PASS airgap_upgrade_scripts"; PASS=$((PASS+1));
else
  echo "FAIL airgap_upgrade_scripts"; FAIL=$((FAIL+1));
fi

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/p5w7_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p5w7.admin.${SUFFIX}@opsedge360.internal\",\"password\":\"P5W7Val!${SUFFIX}Aa\",\"name\":\"P5W7 Admin\",\"organizationName\":\"P5W7 Org ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup got=$SIGN"; cat /tmp/p5w7_signup.json || true; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/p5w7_signup.json')).get('accessToken') or '')" 2>/dev/null || true)
if [ -z "$TOKEN" ]; then echo "FAIL token_missing"; FAIL=$((FAIL+1)); echo "=== RESULT pass=$PASS fail=$FAIL ==="; exit 1; fi

OV=$(curl -sk -o /tmp/p5w7_ov.json -w '%{http_code}' "$API/admin/system/certification" -H "Authorization: Bearer $TOKEN")
check certification_overview 200 "$OV"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w7_ov.json'))
assert d.get('gaClaim') is False
assert d.get('wave')=='v1.0.0-wave7'
pages=d.get('pages') or []
for p in ['performance','load','ha','chaos','security','reliability','reports']:
  assert p in pages
print('PASS certification_pages')
PY
PASS=$((PASS+1))

# Execute real certification runner (production-safe defaults)
export CERT_TOKEN="$TOKEN"
export API_BASE="$API"
export CERT_CONCURRENCY="${CERT_CONCURRENCY:-20}"
export CERT_TOTAL_REQUESTS="${CERT_TOTAL_REQUESTS:-200}"
export CERT_SOAK_SECONDS="${CERT_SOAK_SECONDS:-30}"
export CERT_BENCH_SAMPLES="${CERT_BENCH_SAMPLES:-8}"
if node "$ROOT/scripts/wave7-certify.mjs" --api "$API" --token "$TOKEN"; then
  echo "PASS wave7_certify_runner"; PASS=$((PASS+1));
else
  echo "FAIL wave7_certify_runner"; FAIL=$((FAIL+1));
fi

# Verify suites populated
for suite in performance load ha chaos security scalability operational reliability reports; do
  N=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
    "SELECT COUNT(*) FROM certification_runs WHERE suite_key='$suite' AND status IN ('passed','partial','attested')" | tr -d '[:space:]')
  if [ "${N:-0}" -ge 1 ]; then echo "PASS suite_$suite ($N)"; PASS=$((PASS+1)); else echo "FAIL suite_$suite"; FAIL=$((FAIL+1)); fi
done

RC=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM certification_reports" | tr -d '[:space:]')
if [ "${RC:-0}" -ge 9 ]; then echo "PASS reports_pack ($RC)"; PASS=$((PASS+1)); else echo "FAIL reports_pack got=$RC"; FAIL=$((FAIL+1)); fi

BC=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM benchmark_results" | tr -d '[:space:]')
if [ "${BC:-0}" -ge 1 ]; then echo "PASS benchmarks_stored ($BC)"; PASS=$((PASS+1)); else echo "FAIL benchmarks_stored"; FAIL=$((FAIL+1)); fi

LC=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM load_test_runs" | tr -d '[:space:]')
if [ "${LC:-0}" -ge 1 ]; then echo "PASS load_tests_stored ($LC)"; PASS=$((PASS+1)); else echo "FAIL load_tests_stored"; FAIL=$((FAIL+1)); fi

SC=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM soak_sessions WHERE status IN ('passed','attested')" | tr -d '[:space:]')
if [ "${SC:-0}" -ge 1 ]; then echo "PASS soak_session ($SC)"; PASS=$((PASS+1)); else echo "FAIL soak_session"; FAIL=$((FAIL+1)); fi

# Controlled HA/chaos host drill (gateway recreate)
if CERT_TOKEN="$TOKEN" API_BASE="$API" bash "$ROOT/scripts/wave7-chaos-ha.sh"; then
  echo "PASS chaos_ha_drill"; PASS=$((PASS+1));
else
  echo "FAIL chaos_ha_drill"; FAIL=$((FAIL+1));
fi

# Wait for plane to settle after drills
for i in $(seq 1 30); do
  H=$(curl -sk -o /dev/null -w '%{http_code}' "$API/health" || true)
  if [ "$H" = "200" ]; then break; fi
  sleep 2
done

# Packaging / rollback evidence
if [ -f "$ROOT/scripts/vps-deploy-latest.sh" ]; then echo "PASS docker_deploy_path"; PASS=$((PASS+1)); else echo "FAIL docker_deploy_path"; FAIL=$((FAIL+1)); fi
if grep -q '1.0.0-wave6\|wave6\|opsedge360' "$ROOT/infra/helm/opsedge360/Chart.yaml"; then echo "PASS kubernetes_chart"; PASS=$((PASS+1)); else echo "FAIL kubernetes_chart"; FAIL=$((FAIL+1)); fi
if [ -f "$ROOT/scripts/airgap-verify.sh" ]; then echo "PASS airgap_verify_script"; PASS=$((PASS+1)); else echo "FAIL airgap_verify_script"; FAIL=$((FAIL+1)); fi
# Rollback path: prior production SHA / tag
if cd "$ROOT" && (git rev-parse v1.0.0-wave6 >/dev/null 2>&1 || git cat-file -t 26e93b973f39e2cd8452e9ed15775bcf27b12d2f >/dev/null 2>&1); then
  echo "PASS rollback_wave6_baseline"; PASS=$((PASS+1));
else
  echo "FAIL rollback_wave6_baseline"; FAIL=$((FAIL+1));
fi

UA=$(curl -sk -o /dev/null -w '%{http_code}' "$API/admin/system/certification")
if [ "$UA" = "401" ] || [ "$UA" = "403" ]; then echo "PASS certification_unauth ($UA)"; PASS=$((PASS+1)); else echo "FAIL certification_unauth got=$UA"; FAIL=$((FAIL+1)); fi

# Prior wave smoke
W6=$(curl -sk -o /dev/null -w '%{http_code}' "$API/admin/ops-health" -H "Authorization: Bearer $TOKEN")
check wave6_ops_health_compat 200 "$W6"

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo P5_WAVE7_VALIDATION_OK
