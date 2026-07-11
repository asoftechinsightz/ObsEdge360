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

echo "=== Phase 3 Wave 1 validation @ $API ==="
echo "git: $(cd /opt/OpsEdge360 && git log -1 --oneline)"

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

TC=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='telemetry_collectors';" | tr -d '[:space:]')
check migration_022 1 "${TC:-0}"

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/p3w1_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p3w1.valid.${SUFFIX}@opsedge360.internal\",\"password\":\"P3W1Val!${SUFFIX}\",\"name\":\"P3W1\",\"organizationName\":\"P3W1 Val ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/p3w1_signup.json')).get('accessToken') or '')")

TH=$(curl -sk -o /tmp/p3w1_health.json -w '%{http_code}' "$API/observability/telemetry/health" -H "Authorization: Bearer $TOKEN")
check telemetry_health 200 "$TH"

COL=$(curl -sk -o /tmp/p3w1_col.json -w '%{http_code}' -X POST "$API/observability/telemetry/collectors" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"name\":\"otel-edge-${SUFFIX}\",\"collectorType\":\"otelcol\",\"version\":\"0.111.0\"}")
if [ "$COL" = "201" ] || [ "$COL" = "200" ]; then echo "PASS collector_register ($COL)"; PASS=$((PASS+1)); else echo "FAIL collector_register"; cat /tmp/p3w1_col.json; FAIL=$((FAIL+1)); fi
CID=$(python3 -c "import json;print(json.load(open('/tmp/p3w1_col.json')).get('id') or '')")

HB=$(curl -sk -o /dev/null -w '%{http_code}' -X POST "$API/observability/telemetry/collectors/${CID}/heartbeat" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"version":"0.111.0"}')
check collector_heartbeat 200 "$HB"

MET=$(curl -sk -o /tmp/p3w1_met.json -w '%{http_code}' -X POST "$API/observability/otlp/metrics" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"metrics":[{"name":"p3w1.cpu","value":42,"serviceName":"wave1"}]}')
if [ "$MET" = "200" ] || [ "$MET" = "201" ]; then echo "PASS otlp_metrics ($MET)"; PASS=$((PASS+1)); else echo "FAIL otlp_metrics"; cat /tmp/p3w1_met.json; FAIL=$((FAIL+1)); fi

BAD=$(curl -sk -o /tmp/p3w1_bad.json -w '%{http_code}' -X POST "$API/observability/otlp/metrics" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"notMetrics":true}')
if [ "$BAD" = "400" ]; then echo "PASS quality_gate_reject ($BAD)"; PASS=$((PASS+1)); else echo "FAIL quality_gate_reject got=$BAD"; cat /tmp/p3w1_bad.json; FAIL=$((FAIL+1)); fi

ST=$(curl -sk -o /dev/null -w '%{http_code}' "$API/observability/telemetry/stats" -H "Authorization: Bearer $TOKEN")
check telemetry_stats 200 "$ST"

QY=$(curl -sk -o /dev/null -w '%{http_code}' "$API/observability/telemetry/quality" -H "Authorization: Bearer $TOKEN")
check telemetry_quality 200 "$QY"

RET=$(curl -sk -o /dev/null -w '%{http_code}' "$API/observability/telemetry/retention" -H "Authorization: Bearer $TOKEN")
check telemetry_retention 200 "$RET"

APP=$(curl -sk -o /tmp/p3w1_ret.json -w '%{http_code}' -X POST "$API/observability/telemetry/retention/apply" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
if [ "$APP" = "200" ] || [ "$APP" = "201" ]; then echo "PASS retention_apply ($APP)"; PASS=$((PASS+1)); else echo "FAIL retention_apply"; cat /tmp/p3w1_ret.json; FAIL=$((FAIL+1)); fi

# Cross-tenant collector isolation
SIGN2=$(curl -sk -o /tmp/p3w1_signup2.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p3w1.other.${SUFFIX}@opsedge360.internal\",\"password\":\"P3W1Val!${SUFFIX}\",\"name\":\"P3W1b\",\"organizationName\":\"P3W1 Other ${SUFFIX}\"}")
TOKEN2=$(python3 -c "import json;print(json.load(open('/tmp/p3w1_signup2.json')).get('accessToken') or '')")
XT=$(curl -sk -o /dev/null -w '%{http_code}' -X POST "$API/observability/telemetry/collectors/${CID}/heartbeat" \
  -H "Authorization: Bearer $TOKEN2" -H 'Content-Type: application/json' -d '{}')
if [ "$XT" = "404" ] || [ "$XT" = "403" ]; then echo "PASS cross_tenant_collector ($XT)"; PASS=$((PASS+1)); else echo "FAIL cross_tenant_collector got=$XT"; FAIL=$((FAIL+1)); fi

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo P3_WAVE1_VALIDATION_OK
