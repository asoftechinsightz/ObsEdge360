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

echo "=== Phase 3 Wave 5 validation @ $API ==="
echo "git: $(cd /opt/OpsEdge360 && git log -1 --oneline)"

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

TAB=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='ops_incidents';" | tr -d '[:space:]')
check migration_026 1 "${TAB:-0}"

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/p3w5_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p3w5.valid.${SUFFIX}@opsedge360.internal\",\"password\":\"P3W5Val!${SUFFIX}\",\"name\":\"P3W5\",\"organizationName\":\"P3W5 Val ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/p3w5_signup.json')).get('accessToken') or '')")
TENANT_SLUG=$(python3 -c "import json;print(json.load(open('/tmp/p3w5_signup.json')).get('user',{}).get('tenantId') or '')")

OH=$(curl -sk -o /tmp/p3w5_oh.json -w '%{http_code}' "$API/ops-intelligence/health" -H "Authorization: Bearer $TOKEN")
check ops_health 200 "$OH"

# Seed alert + anomaly for correlation (tenant uuid)
TID=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT id FROM tenants WHERE slug='${TENANT_SLUG}' LIMIT 1;" | tr -d '[:space:]')
if [ -n "$TID" ]; then
  docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c \
    "INSERT INTO alert_events (tenant_id, title, severity, status, labels) VALUES ('$TID', 'W5 high CPU ${SUFFIX}', 'warning', 'firing', '{\"host\":\"w5-host-${SUFFIX}\"}'::jsonb);" >/dev/null
  docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c \
    "INSERT INTO anomalies (tenant_id, anomaly_type, metric_name, baseline_value, observed_value, deviation_sigma, severity, status, source)
     VALUES ('$TID', 'metric_deviation', 'cpu_usage', 10, 40, 3.2, 'high', 'open', 'ops_scan');" >/dev/null
  echo "PASS seed_signals"; PASS=$((PASS+1))
else
  echo "FAIL seed_signals (tenant not found)"; FAIL=$((FAIL+1))
fi

CORR=$(curl -sk -o /tmp/p3w5_corr.json -w '%{http_code}' -X POST "$API/ops-intelligence/correlate" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"windowMinutes":60}')
if [ "$CORR" = "201" ] || [ "$CORR" = "200" ]; then echo "PASS correlate ($CORR)"; PASS=$((PASS+1)); else echo "FAIL correlate got=$CORR"; cat /tmp/p3w5_corr.json; FAIL=$((FAIL+1)); fi

INC=$(curl -sk -o /tmp/p3w5_inc.json -w '%{http_code}' "$API/ops-intelligence/incidents" -H "Authorization: Bearer $TOKEN")
check incidents 200 "$INC"
IID=$(python3 -c "import json;d=json.load(open('/tmp/p3w5_inc.json'));incs=d.get('incidents') or [];print(incs[0]['id'] if incs else '')")

RCA=$(curl -sk -o /tmp/p3w5_rca.json -w '%{http_code}' -X POST "$API/ops-intelligence/rca" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"question\":\"Why is W5 failing ${SUFFIX}?\",\"incidentId\":\"$IID\"}")
if [ "$RCA" = "201" ] || [ "$RCA" = "200" ]; then echo "PASS rca ($RCA)"; PASS=$((PASS+1)); else echo "FAIL rca got=$RCA"; cat /tmp/p3w5_rca.json; FAIL=$((FAIL+1)); fi
RID=$(python3 -c "import json;print(json.load(open('/tmp/p3w5_rca.json')).get('id') or '')")
RGET=$(curl -sk -o /dev/null -w '%{http_code}' "$API/ops-intelligence/rca/${RID}" -H "Authorization: Bearer $TOKEN")
check rca_get 200 "$RGET"

SCAN=$(curl -sk -o /tmp/p3w5_scan.json -w '%{http_code}' -X POST "$API/ops-intelligence/anomalies/scan" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"windowMinutes":60}')
if [ "$SCAN" = "201" ] || [ "$SCAN" = "200" ]; then echo "PASS anomaly_scan ($SCAN)"; PASS=$((PASS+1)); else echo "FAIL anomaly_scan got=$SCAN"; FAIL=$((FAIL+1)); fi

FC=$(curl -sk -o /tmp/p3w5_fc.json -w '%{http_code}' -X POST "$API/ops-intelligence/forecasts/generate" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"horizonHours":24}')
if [ "$FC" = "201" ] || [ "$FC" = "200" ]; then echo "PASS forecasts_generate ($FC)"; PASS=$((PASS+1)); else echo "FAIL forecasts_generate got=$FC"; FAIL=$((FAIL+1)); fi

FL=$(curl -sk -o /dev/null -w '%{http_code}' "$API/ops-intelligence/forecasts" -H "Authorization: Bearer $TOKEN")
check forecasts_list 200 "$FL"

REM=$(curl -sk -o /tmp/p3w5_rem.json -w '%{http_code}' -X POST "$API/ops-intelligence/remediation/request" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"action\":\"restart w5-host-${SUFFIX}\",\"incidentId\":\"$IID\",\"riskTier\":\"medium\"}")
if [ "$REM" = "201" ] || [ "$REM" = "200" ]; then echo "PASS remediation_request ($REM)"; PASS=$((PASS+1)); else echo "FAIL remediation_request"; cat /tmp/p3w5_rem.json; FAIL=$((FAIL+1)); fi
REMID=$(python3 -c "import json;print(json.load(open('/tmp/p3w5_rem.json')).get('id') or '')")

EXEC=$(curl -sk -o /tmp/p3w5_exec.json -w '%{http_code}' -X POST "$API/ops-intelligence/remediation/approvals/${REMID}/execute" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
if [ "$EXEC" = "200" ] || [ "$EXEC" = "201" ]; then echo "PASS remediation_dry_run ($EXEC)"; PASS=$((PASS+1)); else echo "FAIL remediation_dry_run got=$EXEC"; cat /tmp/p3w5_exec.json; FAIL=$((FAIL+1)); fi

SIG=$(curl -sk -o /dev/null -w '%{http_code}' "$API/ops-intelligence/signals" -H "Authorization: Bearer $TOKEN")
check signals 200 "$SIG"

# Cross-tenant: other tenant cannot read our RCA
SIGN2=$(curl -sk -o /tmp/p3w5_signup2.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p3w5.other.${SUFFIX}@opsedge360.internal\",\"password\":\"P3W5Val!${SUFFIX}\",\"name\":\"P3W5b\",\"organizationName\":\"P3W5 Other ${SUFFIX}\"}")
TOKEN2=$(python3 -c "import json;print(json.load(open('/tmp/p3w5_signup2.json')).get('accessToken') or '')")
XT=$(curl -sk -o /dev/null -w '%{http_code}' "$API/ops-intelligence/rca/${RID}" -H "Authorization: Bearer $TOKEN2")
if [ "$XT" = "404" ] || [ "$XT" = "403" ] || [ "$XT" = "400" ]; then echo "PASS cross_tenant_rca ($XT)"; PASS=$((PASS+1)); else echo "FAIL cross_tenant_rca got=$XT"; FAIL=$((FAIL+1)); fi

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo P3_WAVE5_VALIDATION_OK
