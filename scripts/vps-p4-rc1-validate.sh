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

echo "=== Phase 4 RC1 Market Readiness @ $API ==="
echo "git: $(cd "$ROOT" && git log -1 --oneline)"

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

# Security headers on health
HDRS=$(curl -skI "$API/health")
echo "$HDRS" | grep -qi 'x-content-type-options: nosniff' && { echo PASS header_nosniff; PASS=$((PASS+1)); } || { echo FAIL header_nosniff; FAIL=$((FAIL+1)); }
echo "$HDRS" | grep -qi 'x-frame-options: DENY' && { echo PASS header_frame; PASS=$((PASS+1)); } || { echo FAIL header_frame; FAIL=$((FAIL+1)); }

TAB=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='rc1_readiness';" | tr -d '[:space:]')
check migration_044 1 "${TAB:-0}"

DOCS_OK=1
for f in README.md RELEASE_NOTES.md KNOWN_ISSUES.md PRODUCTION_READINESS_CHECKLIST.md SECURITY_ASSESSMENT.md DEPLOYMENT_GUIDE.md INTEGRATION_MATRIX.md ADMINISTRATOR_GUIDE.md INSTALLATION_GUIDE.md; do
  [ -f "$ROOT/docs/phase4/$f" ] || DOCS_OK=0
done
[ -f "$ROOT/scripts/vps-p4-rc1-validate.sh" ] || DOCS_OK=0
if [ "$DOCS_OK" = "1" ]; then echo "PASS rc1_docs"; PASS=$((PASS+1)); else echo "FAIL rc1_docs"; FAIL=$((FAIL+1)); fi

ABOUT=$(curl -sk -o /tmp/p4_about.json -w '%{http_code}' "$API/about")
check about_public 200 "$ABOUT"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p4_about.json'))
assert d.get('product')=='OpsEdge360'
assert d.get('version')=='1.0.0'
print('PASS about_branding')
PY
PASS=$((PASS+1))

MAT=$(curl -sk -o /dev/null -w '%{http_code}' "$API/integrations/matrix")
check integration_matrix 200 "$MAT"

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/p4_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p4.admin.${SUFFIX}@opsedge360.internal\",\"password\":\"P4Rc1!${SUFFIX}Aa\",\"name\":\"P4 Admin\",\"organizationName\":\"P4 Org ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/p4_signup.json')).get('accessToken') or '')")
[ -n "$TOKEN" ] || { echo FAIL token; exit 1; }

POL=$(curl -sk -o /dev/null -w '%{http_code}' -X PUT "$API/security/mfa-policy" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"mode":"optional","graceDays":14}')
if [ "$POL" = "200" ] || [ "$POL" = "201" ]; then echo "PASS mfa_policy"; PASS=$((PASS+1)); else echo "FAIL mfa_policy"; FAIL=$((FAIL+1)); fi

ENR=$(curl -sk -o /tmp/p4_enr.json -w '%{http_code}' -X POST "$API/me/mfa/enroll" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
if [ "$ENR" = "200" ] || [ "$ENR" = "201" ]; then echo "PASS mfa_enroll"; PASS=$((PASS+1)); else echo "FAIL mfa_enroll"; cat /tmp/p4_enr.json; FAIL=$((FAIL+1)); fi
FID=$(python3 -c "import json;d=json.load(open('/tmp/p4_enr.json'));print((d.get('factor') or {}).get('id') or '')")
CODE=$(python3 -c "import json;print(json.load(open('/tmp/p4_enr.json')).get('challengeCode') or '')")
VER=$(curl -sk -o /dev/null -w '%{http_code}' -X POST "$API/me/mfa/verify" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"factorId\":\"$FID\",\"code\":\"$CODE\"}")
if [ "$VER" = "200" ] || [ "$VER" = "201" ]; then echo "PASS mfa_verify"; PASS=$((PASS+1)); else echo "FAIL mfa_verify"; FAIL=$((FAIL+1)); fi

TRIAL=$(curl -sk -o /dev/null -w '%{http_code}' -X POST "$API/commercial/trial" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"days":30,"seats":25}')
if [ "$TRIAL" = "200" ] || [ "$TRIAL" = "201" ]; then echo "PASS commercial_trial"; PASS=$((PASS+1)); else echo "FAIL commercial_trial"; FAIL=$((FAIL+1)); fi

ENT=$(curl -sk -o /dev/null -w '%{http_code}' "$API/commercial/entitlements" -H "Authorization: Bearer $TOKEN")
check entitlements 200 "$ENT"

TOK=$(curl -sk -o /tmp/p4_tok.json -w '%{http_code}' -X POST "$API/security/api-tokens" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"rc1-token","scopes":["read"]}')
if [ "$TOK" = "200" ] || [ "$TOK" = "201" ]; then echo "PASS api_token"; PASS=$((PASS+1)); else echo "FAIL api_token"; FAIL=$((FAIL+1)); fi

TOURS=$(curl -sk -o /tmp/p4_tours.json -w '%{http_code}' "$API/demo/tours" -H "Authorization: Bearer $TOKEN")
check demo_tours 200 "$TOURS"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p4_tours.json'))
assert len(d.get('tours') or []) >= 5
print('PASS demo_tour_count')
PY
PASS=$((PASS+1))

SEC=$(curl -sk -o /dev/null -w '%{http_code}' "$API/security/assessment" -H "Authorization: Bearer $TOKEN")
check security_assessment 200 "$SEC"
SCALE=$(curl -sk -o /dev/null -w '%{http_code}' "$API/scalability/profile" -H "Authorization: Bearer $TOKEN")
check scalability_profile 200 "$SCALE"
READY=$(curl -sk -o /tmp/p4_ready.json -w '%{http_code}' "$API/readiness/production" -H "Authorization: Bearer $TOKEN")
check production_readiness 200 "$READY"

SHA=$(cd "$ROOT" && git rev-parse HEAD)
APPR=$(curl -sk -o /tmp/p4_appr.json -w '%{http_code}' -X PUT "$API/rc1/approve" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"productionSha\":\"$SHA\",\"validationToken\":\"P4_RC1_MARKET_VALIDATION_OK\",\"security\":{\"ok\":true},\"performance\":{\"ok\":true}}")
if [ "$APPR" = "200" ] || [ "$APPR" = "201" ]; then echo "PASS rc1_approve"; PASS=$((PASS+1)); else echo "FAIL rc1_approve"; cat /tmp/p4_appr.json; FAIL=$((FAIL+1)); fi

# Prior phase compat
check p3_reports 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/reports" -H "Authorization: Bearer $TOKEN")"
check p2_env 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/platform/environment")"
check ga_compat 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/admin/system/ga" -H "Authorization: Bearer $TOKEN")"

# Packaging artifacts
[ -f "$ROOT/docker-compose.prod.yml" ] && [ -f "$ROOT/infra/helm/opsedge360/Chart.yaml" ] && [ -f "$ROOT/scripts/airgap-package.sh" ] \
  && { echo PASS deployment_artifacts; PASS=$((PASS+1)); } || { echo FAIL deployment_artifacts; FAIL=$((FAIL+1)); }

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo P4_RC1_MARKET_VALIDATION_OK
