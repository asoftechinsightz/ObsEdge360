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

echo "=== Phase 3 validation @ $API ==="
echo "git: $(cd "$ROOT" && git log -1 --oneline)"

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

TAB=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='marketplace_extensions';" | tr -d '[:space:]')
check migration_043 1 "${TAB:-0}"

DOCS_OK=1
for f in PHASE3_VALIDATION.md DEPLOYMENT_REPORT.md; do
  [ -f "$ROOT/docs/phase3/$f" ] || DOCS_OK=0
done
[ -f "$ROOT/scripts/vps-p3-validate.sh" ] || DOCS_OK=0
if [ "$DOCS_OK" = "1" ]; then echo "PASS phase3_docs"; PASS=$((PASS+1)); else echo "FAIL phase3_docs"; FAIL=$((FAIL+1)); fi

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/p3_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p3.admin.${SUFFIX}@opsedge360.internal\",\"password\":\"P3Val!${SUFFIX}Aa\",\"name\":\"P3 Admin\",\"organizationName\":\"P3 Org ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/p3_signup.json')).get('accessToken') or '')")
[ -n "$TOKEN" ] || { echo FAIL token; exit 1; }

PREF=$(curl -sk -o /tmp/p3_pref.json -w '%{http_code}' -X PATCH "$API/me/preferences" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"theme":"dark","landingPath":"/dashboard"}')
check preferences 200 "$PREF"

CHAT=$(curl -sk -o /tmp/p3_chat.json -w '%{http_code}' -X POST "$API/copilot/chat" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Give me an executive summary"}]}')
if [ "$CHAT" = "200" ] || [ "$CHAT" = "201" ]; then echo "PASS copilot_chat ($CHAT)"; PASS=$((PASS+1)); else echo "FAIL copilot_chat got=$CHAT"; FAIL=$((FAIL+1)); fi
python3 - <<'PY'
import json
d=json.load(open('/tmp/p3_chat.json'))
assert d.get('reply')
assert d.get('structured') and 'disclaimer' in d['structured']
print('PASS copilot_structured')
PY
PASS=$((PASS+1))

PROB=$(curl -sk -o /tmp/p3_prob.json -w '%{http_code}' -X POST "$API/itsm/problems" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"P3 checkout latency problem","priority":"high"}')
if [ "$PROB" = "200" ] || [ "$PROB" = "201" ]; then echo "PASS itsm_problem"; PASS=$((PASS+1)); else echo "FAIL itsm_problem"; FAIL=$((FAIL+1)); fi

CHG=$(curl -sk -o /tmp/p3_chg.json -w '%{http_code}' -X POST "$API/itsm/changes" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"P3 scale pods","cabRequired":true}')
if [ "$CHG" = "200" ] || [ "$CHG" = "201" ]; then echo "PASS itsm_change"; PASS=$((PASS+1)); else echo "FAIL itsm_change"; FAIL=$((FAIL+1)); fi

CAL=$(curl -sk -o /dev/null -w '%{http_code}' "$API/itsm/calendar" -H "Authorization: Bearer $TOKEN")
check itsm_calendar 200 "$CAL"

JOURNEY=$(curl -sk -o /tmp/p3_j.json -w '%{http_code}' -X POST "$API/synthetics/browser/journeys" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"P3 Health Journey","baseUrl":"https://api.observability360.asoftechinsightz.com/api/v1/health"}')
if [ "$JOURNEY" = "200" ] || [ "$JOURNEY" = "201" ]; then echo "PASS browser_journey_create"; PASS=$((PASS+1)); else echo "FAIL browser_journey_create"; cat /tmp/p3_j.json; FAIL=$((FAIL+1)); fi
JID=$(python3 -c "import json;print(json.load(open('/tmp/p3_j.json')).get('id') or '')")
if [ -n "$JID" ]; then
  JR=$(curl -sk -o /tmp/p3_jr.json -w '%{http_code}' -X POST "$API/synthetics/browser/journeys/$JID/run" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
  if [ "$JR" = "200" ] || [ "$JR" = "201" ]; then echo "PASS browser_journey_run"; PASS=$((PASS+1)); else echo "FAIL browser_journey_run"; FAIL=$((FAIL+1)); fi
else
  echo "FAIL browser_journey_id"; FAIL=$((FAIL+1))
fi

REP=$(curl -sk -o /tmp/p3_rep.json -w '%{http_code}' -X POST "$API/reports/generate" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"reportType":"executive_summary"}')
if [ "$REP" = "200" ] || [ "$REP" = "201" ]; then echo "PASS report_generate"; PASS=$((PASS+1)); else echo "FAIL report_generate"; FAIL=$((FAIL+1)); fi
RID=$(python3 -c "import json;print(json.load(open('/tmp/p3_rep.json')).get('id') or '')")
if [ -n "$RID" ]; then
  EX=$(curl -sk -o /dev/null -w '%{http_code}' "$API/reports/$RID/export?format=csv" -H "Authorization: Bearer $TOKEN")
  check report_export_csv 200 "$EX"
fi

MKT=$(curl -sk -o /dev/null -w '%{http_code}' "$API/marketplace/extensions" -H "Authorization: Bearer $TOKEN")
check marketplace 200 "$MKT"

PAY=$(curl -sk -o /tmp/p3_pay.json -w '%{http_code}' -X POST "$API/banking360/payment-monitors" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"rail":"upi","name":"UPI switch probe","target":"https://api.observability360.asoftechinsightz.com/api/v1/health","sloTargetMs":3000}')
if [ "$PAY" = "200" ] || [ "$PAY" = "201" ]; then echo "PASS banking_payment_monitor"; PASS=$((PASS+1)); else echo "FAIL banking_payment_monitor"; FAIL=$((FAIL+1)); fi

MFA=$(curl -sk -o /dev/null -w '%{http_code}' "$API/me/mfa" -H "Authorization: Bearer $TOKEN")
check mfa_framework 200 "$MFA"

# Phase 2 compat
ENV=$(curl -sk -o /dev/null -w '%{http_code}' "$API/platform/environment")
check env_compat 200 "$ENV"
GA=$(curl -sk -o /dev/null -w '%{http_code}' "$API/admin/system/ga" -H "Authorization: Bearer $TOKEN")
check ga_compat 200 "$GA"

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo P3_ENTERPRISE_EXCELLENCE_VALIDATION_OK
