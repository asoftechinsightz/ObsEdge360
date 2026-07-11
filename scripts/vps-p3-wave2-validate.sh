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

echo "=== Phase 3 Wave 2 validation @ $API ==="
echo "git: $(cd /opt/OpsEdge360 && git log -1 --oneline)"

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

AG=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='agents';" | tr -d '[:space:]')
check migration_023 1 "${AG:-0}"

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/p3w2_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p3w2.valid.${SUFFIX}@opsedge360.internal\",\"password\":\"P3W2Val!${SUFFIX}\",\"name\":\"P3W2\",\"organizationName\":\"P3W2 Val ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/p3w2_signup.json')).get('accessToken') or '')")

SUM=$(curl -sk -o /tmp/p3w2_sum.json -w '%{http_code}' "$API/ua/summary" -H "Authorization: Bearer $TOKEN")
check ua_summary 200 "$SUM"

BT=$(curl -sk -o /tmp/p3w2_bt.json -w '%{http_code}' -X POST "$API/ua/bootstrap-tokens" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"label":"wave2-val","ttlHours":2,"maxUses":5}')
if [ "$BT" = "201" ] || [ "$BT" = "200" ]; then echo "PASS bootstrap_token ($BT)"; PASS=$((PASS+1)); else echo "FAIL bootstrap_token"; cat /tmp/p3w2_bt.json; FAIL=$((FAIL+1)); fi
BTOKEN=$(python3 -c "import json;print(json.load(open('/tmp/p3w2_bt.json')).get('token') or '')")

EN=$(curl -sk -o /tmp/p3w2_en.json -w '%{http_code}' -X POST "$API/ua/enroll" \
  -H 'Content-Type: application/json' \
  -d "{\"bootstrapToken\":\"$BTOKEN\",\"name\":\"ua-val-${SUFFIX}\",\"hostname\":\"host-${SUFFIX}\",\"platform\":\"linux\",\"version\":\"1.0.0\",\"inventory\":{\"ipAddresses\":[\"10.0.0.1\"],\"cpu\":{\"cores\":2}}}")
if [ "$EN" = "201" ] || [ "$EN" = "200" ]; then echo "PASS enroll ($EN)"; PASS=$((PASS+1)); else echo "FAIL enroll"; cat /tmp/p3w2_en.json; FAIL=$((FAIL+1)); fi
AID=$(python3 -c "import json;print(json.load(open('/tmp/p3w2_en.json')).get('agent',{}).get('id') or '')")
AKEY=$(python3 -c "import json;print(json.load(open('/tmp/p3w2_en.json')).get('agentKey') or '')")

HB=$(curl -sk -o /dev/null -w '%{http_code}' -X POST "$API/ua/agents/${AID}/heartbeat" \
  -H "X-Agent-Key: $AKEY" -H 'Content-Type: application/json' \
  -d '{"status":"online","version":"1.0.0","hostname":"host-'"${SUFFIX}"'","metrics":{"cpuPct":11,"memoryPct":22},"health":{"healthy":true,"queueDepth":0}}')
check heartbeat 200 "$HB"

INV=$(curl -sk -o /dev/null -w '%{http_code}' -X POST "$API/ua/agents/${AID}/inventory" \
  -H "X-Agent-Key: $AKEY" -H 'Content-Type: application/json' \
  -d '{"ipAddresses":["10.0.0.2"],"macAddresses":["aa:bb:cc:dd:ee:ff"],"cpu":{"cores":4},"memory":{"totalBytes":8},"region":"us-east-1"}')
check inventory 200 "$INV"

CFG=$(curl -sk -o /tmp/p3w2_cfg.json -w '%{http_code}' "$API/ua/agents/${AID}/config" -H "X-Agent-Key: $AKEY")
check config_pull 200 "$CFG"

PL=$(curl -sk -o /dev/null -w '%{http_code}' -X POST "$API/ua/agents/${AID}/plugins" \
  -H "X-Agent-Key: $AKEY" -H 'Content-Type: application/json' \
  -d '{"plugins":[{"pluginId":"host.metrics","name":"Host Metrics","version":"1.0.0","status":"enabled"}]}')
check plugins 200 "$PL"

MET=$(curl -sk -o /tmp/p3w2_met.json -w '%{http_code}' -X POST "$API/ua/agents/${AID}/telemetry/metrics" \
  -H "X-Agent-Key: $AKEY" -H 'Content-Type: application/json' \
  -d '{"metrics":[{"name":"ua.wave2.cpu","value":7,"serviceName":"universal-agent"}]}')
# forwardOtlp returns wrapper {status,data}; HTTP from gateway should be 201/200
if [ "$MET" = "200" ] || [ "$MET" = "201" ]; then
  INNER=$(python3 -c "import json;print(json.load(open('/tmp/p3w2_met.json')).get('status') or 0)")
  if [ "$INNER" = "200" ] || [ "$INNER" = "201" ]; then echo "PASS telemetry_metrics"; PASS=$((PASS+1));
  else echo "FAIL telemetry_metrics inner=$INNER"; cat /tmp/p3w2_met.json; FAIL=$((FAIL+1)); fi
else echo "FAIL telemetry_metrics http=$MET"; cat /tmp/p3w2_met.json; FAIL=$((FAIL+1)); fi

LIST=$(curl -sk -o /dev/null -w '%{http_code}' "$API/ua/agents?q=ua-val-${SUFFIX}" -H "Authorization: Bearer $TOKEN")
check agents_list 200 "$LIST"

AH=$(curl -sk -o /dev/null -w '%{http_code}' "$API/ua/agents/${AID}/health" -H "Authorization: Bearer $TOKEN")
check agent_health 200 "$AH"

# Missing agent key
NOKEY=$(curl -sk -o /dev/null -w '%{http_code}' -X POST "$API/ua/agents/${AID}/heartbeat" \
  -H 'Content-Type: application/json' -d '{"status":"online"}')
if [ "$NOKEY" = "401" ]; then echo "PASS auth_required ($NOKEY)"; PASS=$((PASS+1)); else echo "FAIL auth_required got=$NOKEY"; FAIL=$((FAIL+1)); fi

# Cross-tenant
SIGN2=$(curl -sk -o /tmp/p3w2_signup2.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p3w2.other.${SUFFIX}@opsedge360.internal\",\"password\":\"P3W2Val!${SUFFIX}\",\"name\":\"P3W2b\",\"organizationName\":\"P3W2 Other ${SUFFIX}\"}")
TOKEN2=$(python3 -c "import json;print(json.load(open('/tmp/p3w2_signup2.json')).get('accessToken') or '')")
XT=$(curl -sk -o /dev/null -w '%{http_code}' "$API/ua/agents/${AID}" -H "Authorization: Bearer $TOKEN2")
if [ "$XT" = "404" ] || [ "$XT" = "403" ]; then echo "PASS cross_tenant ($XT)"; PASS=$((PASS+1)); else echo "FAIL cross_tenant got=$XT"; FAIL=$((FAIL+1)); fi

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo P3_WAVE2_VALIDATION_OK
