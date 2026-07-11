#!/bin/bash
set -euo pipefail
API="${API_BASE:-https://api.observability360.asoftechinsightz.com/api/v1}"
PASS=0
FAIL=0
check() {
  local name="$1" expect="$2" got="$3"
  if [ "$got" = "$expect" ]; then echo "PASS $name ($got)"; PASS=$((PASS+1));
  else echo "FAIL $name expected=$expect got=$got"; FAIL=$((FAIL+1)); fi
}

echo "=== Wave 6 validation @ $API ==="
echo "git: $(cd /opt/OpsEdge360 && git log -1 --oneline)"

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

SE=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='security_events';" | tr -d '[:space:]')
check migration_020 1 "${SE:-0}"

RULES=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM security_detection_rules WHERE tenant_id IS NULL;" | tr -d '[:space:]')
if [ "${RULES:-0}" -ge 3 ]; then echo "PASS default_rules ($RULES)"; PASS=$((PASS+1)); else echo "FAIL default_rules"; FAIL=$((FAIL+1)); fi

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/w6_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"wave6.valid.${SUFFIX}@opsedge360.internal\",\"password\":\"Wave6Val!${SUFFIX}\",\"name\":\"W6\",\"organizationName\":\"Wave6 Val ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/w6_signup.json')).get('accessToken') or '')")

OH=$(curl -sk -o /dev/null -w '%{http_code}' "$API/security-observability/health" -H "Authorization: Bearer $TOKEN")
check obs_health 200 "$OH"

ING=$(curl -sk -o /tmp/w6_ing.json -w '%{http_code}' -X POST "$API/security-observability/events" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"eventType\":\"authz.deny\",\"category\":\"authorization\",\"severity\":\"high\",\"correlationId\":\"corr-${SUFFIX}\",\"traceId\":\"trace-${SUFFIX}\",\"payload\":{\"test\":true}}")
if [ "$ING" = "201" ] || [ "$ING" = "200" ]; then echo "PASS event_ingest ($ING)"; PASS=$((PASS+1)); else echo "FAIL event_ingest"; cat /tmp/w6_ing.json; FAIL=$((FAIL+1)); fi

SR=$(curl -sk -o /dev/null -w '%{http_code}' "$API/security-observability/events?limit=10" -H "Authorization: Bearer $TOKEN")
check event_search 200 "$SR"

DB=$(curl -sk -o /tmp/w6_dash.json -w '%{http_code}' "$API/security-observability/dashboard" -H "Authorization: Bearer $TOKEN")
check dashboard 200 "$DB"

RL=$(curl -sk -o /dev/null -w '%{http_code}' "$API/security-observability/rules" -H "Authorization: Bearer $TOKEN")
check rules_list 200 "$RL"

AL=$(curl -sk -o /dev/null -w '%{http_code}' "$API/security-observability/alerts" -H "Authorization: Bearer $TOKEN")
check alerts_list 200 "$AL"

# Trigger cross-tenant to feed authz.cross_tenant into obs
curl -sk -o /dev/null -w '%{http_code}' "$API/cmdb/stats" -H "Authorization: Bearer $TOKEN" -H "X-Tenant-ID: spoof-other" >/tmp/w6_xt.code
XT=$(cat /tmp/w6_xt.code)
check cross_tenant_still_403 403 "$XT"

MET=$(curl -sk "$API/metrics")
if echo "$MET" | grep -q 'security_'; then echo "PASS metrics_security_counters"; PASS=$((PASS+1)); else echo "FAIL metrics_security_counters"; FAIL=$((FAIL+1)); fi

# Cross-tenant event search isolation
SIGN2=$(curl -sk -o /tmp/w6_signup2.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"wave6.other.${SUFFIX}@opsedge360.internal\",\"password\":\"Wave6Val!${SUFFIX}\",\"name\":\"W6b\",\"organizationName\":\"Wave6 Other ${SUFFIX}\"}")
TOKEN2=$(python3 -c "import json;print(json.load(open('/tmp/w6_signup2.json')).get('accessToken') or '')")
SR2=$(curl -sk -o /tmp/w6_sr2.json -w '%{http_code}' "$API/security-observability/events?correlationId=corr-${SUFFIX}" -H "Authorization: Bearer $TOKEN2")
check other_tenant_search_http 200 "$SR2"
CNT=$(python3 -c "import json;print(len(json.load(open('/tmp/w6_sr2.json')).get('items') or []))")
if [ "$CNT" = "0" ]; then echo "PASS cross_tenant_event_isolation"; PASS=$((PASS+1)); else echo "FAIL cross_tenant_event_isolation count=$CNT"; FAIL=$((FAIL+1)); fi

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo WAVE6_VALIDATION_OK
