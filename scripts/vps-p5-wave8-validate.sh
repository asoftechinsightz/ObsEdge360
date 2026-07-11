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

echo "=== Phase 5 Wave 8 validation @ $API ==="
echo "git: $(cd "$ROOT" && git log -1 --oneline)"

for i in $(seq 1 40); do
  H=$(curl -sk -o /dev/null -w '%{http_code}' "$API/health" || true)
  [ "$H" = "200" ] && break
  sleep 3
done
check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

TAB=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='release_candidate_profiles';" | tr -d '[:space:]')
check migration_040_rc 1 "${TAB:-0}"

PILOT=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM pilot_checklists" | tr -d '[:space:]')
if [ "${PILOT:-0}" -ge 5 ]; then echo "PASS pilot_checklists ($PILOT)"; PASS=$((PASS+1)); else echo "FAIL pilot_checklists"; FAIL=$((FAIL+1)); fi

DOCS_OK=1
for f in ReleaseChecklist.md UpgradeGuide.md InstallationGuide.md AdministratorGuide.md OperationsGuide.md PilotGuide.md SupportGuide.md Troubleshooting.md OpenAPIGuide.md ReleaseNotes.md; do
  [ -f "$ROOT/docs/Wave8/$f" ] || DOCS_OK=0
done
if [ "$DOCS_OK" = "1" ]; then echo "PASS documentation_wave8"; PASS=$((PASS+1)); else echo "FAIL documentation_wave8"; FAIL=$((FAIL+1)); fi

for s in package-rc.sh wave8-rc-validate-install.sh demo-rc-seed.sh export-openapi-rc.sh; do
  if [ -f "$ROOT/scripts/$s" ]; then echo "PASS script_$s"; PASS=$((PASS+1)); else echo "FAIL script_$s"; FAIL=$((FAIL+1)); fi
done

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/p5w8_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p5w8.admin.${SUFFIX}@opsedge360.internal\",\"password\":\"P5W8Val!${SUFFIX}Aa\",\"name\":\"P5W8 Admin\",\"organizationName\":\"P5W8 Org ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/p5w8_signup.json')).get('accessToken') or '')" 2>/dev/null || true)
[ -n "$TOKEN" ] || { echo FAIL token; exit 1; }

OV=$(curl -sk -o /tmp/p5w8_ov.json -w '%{http_code}' "$API/admin/system/release-candidate" -H "Authorization: Bearer $TOKEN")
check rc_overview 200 "$OV"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w8_ov.json'))
assert d.get('gaClaim') is False
assert d.get('wave')=='v1.0.0-rc1'
assert d.get('docs',{}).get('frozen') is True
print('PASS rc_docs_frozen')
PY
PASS=$((PASS+1))

RD=$(curl -sk -o /tmp/p5w8_rd.json -w '%{http_code}' "$API/admin/system/release-candidate/readiness" -H "Authorization: Bearer $TOKEN")
check readiness 200 "$RD"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w8_rd.json'))
assert d.get('readyForPilot') is True
print('PASS ready_for_pilot')
PY
PASS=$((PASS+1))

OA=$(curl -sk -o /tmp/p5w8_oa.json -w '%{http_code}' "$API/admin/system/release-candidate/openapi" -H "Authorization: Bearer $TOKEN")
check openapi_meta 200 "$OA"

# Live OpenAPI JSON
OJ=$(curl -sk -o /tmp/p5w8_openapi.json -w '%{http_code}' "${API%/api/v1}/api/docs-json")
if [ "$OJ" != "200" ]; then OJ=$(curl -sk -o /tmp/p5w8_openapi.json -w '%{http_code}' "$API/openapi.json"); fi
check openapi_json 200 "$OJ"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w8_openapi.json'))
info=d.get('info') or {}
assert 'OpsEdge360' in str(info.get('title',''))
assert len(d.get('paths') or {}) >= 10
print('PASS openapi_paths', len(d.get('paths') or {}))
PY
PASS=$((PASS+1))

# Install/upgrade/rollback attestations (real compose/helm/airgap checks)
export CERT_TOKEN="$TOKEN" API_BASE="$API"
if bash "$ROOT/scripts/wave8-rc-validate-install.sh"; then echo "PASS install_validation"; PASS=$((PASS+1)); else echo "FAIL install_validation"; FAIL=$((FAIL+1)); fi

for t in docker_fresh kubernetes_fresh airgap upgrade rollback demo; do
  N=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
    "SELECT COUNT(*) FROM release_install_attestations WHERE install_type='$t' AND status IN ('passed','attested')" | tr -d '[:space:]')
  if [ "${N:-0}" -ge 1 ]; then echo "PASS attest_$t"; PASS=$((PASS+1)); else echo "FAIL attest_$t"; FAIL=$((FAIL+1)); fi
done

# Demo seed
if bash "$ROOT/scripts/demo-rc-seed.sh"; then echo "PASS demo_seed"; PASS=$((PASS+1)); else echo "FAIL demo_seed"; FAIL=$((FAIL+1)); fi
DEMOS=$(curl -sk -o /tmp/p5w8_demo.json -w '%{http_code}' "$API/admin/system/release-candidate/demo" -H "Authorization: Bearer $TOKEN")
check demo_api 200 "$DEMOS"
DID=$(python3 -c "import json;print((json.load(open('/tmp/p5w8_demo.json')).get('demos') or [{}])[0].get('id') or '')")
SEED=$(curl -sk -o /dev/null -w '%{http_code}' -X POST "$API/admin/system/release-candidate/demo/$DID/seed" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
if [ "$SEED" = "200" ] || [ "$SEED" = "201" ]; then echo "PASS demo_attest ($SEED)"; PASS=$((PASS+1)); else echo "FAIL demo_attest"; FAIL=$((FAIL+1)); fi

# Packaging dry-run (RC bundle)
mkdir -p /tmp/opsedge360-rc-out
if bash "$ROOT/scripts/package-rc.sh" /tmp/opsedge360-rc-out; then echo "PASS rc_package"; PASS=$((PASS+1)); else echo "FAIL rc_package"; FAIL=$((FAIL+1)); fi

# Pilot API
PL=$(curl -sk -o /dev/null -w '%{http_code}' "$API/admin/system/release-candidate/pilot" -H "Authorization: Bearer $TOKEN")
check pilot_api 200 "$PL"

# Prior wave smoke
W7=$(curl -sk -o /dev/null -w '%{http_code}' "$API/admin/system/certification" -H "Authorization: Bearer $TOKEN")
check wave7_cert_compat 200 "$W7"

UA=$(curl -sk -o /dev/null -w '%{http_code}' "$API/admin/system/release-candidate")
if [ "$UA" = "401" ] || [ "$UA" = "403" ]; then echo "PASS rc_unauth ($UA)"; PASS=$((PASS+1)); else echo "FAIL rc_unauth got=$UA"; FAIL=$((FAIL+1)); fi

# Rollback baseline
if cd "$ROOT" && (git rev-parse v1.0.0-wave7 >/dev/null 2>&1 || git cat-file -t bc3ceeb958a0defa3118b44dcbf034b999f9ec49 >/dev/null 2>&1); then
  echo "PASS rollback_baseline"; PASS=$((PASS+1));
else
  echo "FAIL rollback_baseline"; FAIL=$((FAIL+1));
fi

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo P5_WAVE8_VALIDATION_OK
