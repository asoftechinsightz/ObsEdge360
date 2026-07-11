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

echo "=== Phase 3 Wave 6 validation @ $API ==="
echo "git: $(cd /opt/OpsEdge360 && git log -1 --oneline)"

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

TAB=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='ops_dashboards';" | tr -d '[:space:]')
check migration_027 1 "${TAB:-0}"

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/p3w6_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p3w6.valid.${SUFFIX}@opsedge360.internal\",\"password\":\"P3W6Val!${SUFFIX}\",\"name\":\"P3W6\",\"organizationName\":\"P3W6 Val ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/p3w6_signup.json')).get('accessToken') or '')")

CAT=$(curl -sk -o /tmp/p3w6_cat.json -w '%{http_code}' "$API/dashboards/catalog" -H "Authorization: Bearer $TOKEN")
check catalog 200 "$CAT"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p3w6_cat.json'))
assert len(d.get('widgets') or []) >= 5
print('PASS catalog_widgets')
PY
PASS=$((PASS+1))

CREATE=$(curl -sk -o /tmp/p3w6_dash.json -w '%{http_code}' -X POST "$API/dashboards" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"name\":\"NOC W6 ${SUFFIX}\",\"seedNoc\":true,\"refreshSeconds\":15}")
if [ "$CREATE" = "201" ] || [ "$CREATE" = "200" ]; then echo "PASS dashboard_create ($CREATE)"; PASS=$((PASS+1)); else echo "FAIL dashboard_create"; cat /tmp/p3w6_dash.json; FAIL=$((FAIL+1)); fi
DID=$(python3 -c "import json;print(json.load(open('/tmp/p3w6_dash.json')).get('id') or '')")

LIST=$(curl -sk -o /dev/null -w '%{http_code}' "$API/dashboards" -H "Authorization: Bearer $TOKEN")
check dashboard_list 200 "$LIST"

GET=$(curl -sk -o /tmp/p3w6_get.json -w '%{http_code}' "$API/dashboards/${DID}" -H "Authorization: Bearer $TOKEN")
check dashboard_get 200 "$GET"
WID=$(python3 -c "import json;d=json.load(open('/tmp/p3w6_get.json'));ws=d.get('widgets') or [];print(ws[0]['id'] if ws else '')")

ADD=$(curl -sk -o /tmp/p3w6_w.json -w '%{http_code}' -X POST "$API/dashboards/${DID}/widgets" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"widgetType":"cmdb_stats","title":"CMDB","gridX":0,"gridY":10,"gridW":4,"gridH":3}')
if [ "$ADD" = "201" ] || [ "$ADD" = "200" ]; then echo "PASS widget_add ($ADD)"; PASS=$((PASS+1)); else echo "FAIL widget_add"; cat /tmp/p3w6_w.json; FAIL=$((FAIL+1)); fi
WID2=$(python3 -c "import json;print(json.load(open('/tmp/p3w6_w.json')).get('id') or '')")

LAYOUT=$(curl -sk -o /tmp/p3w6_layout.json -w '%{http_code}' -X PUT "$API/dashboards/${DID}/layout" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"widgets\":[{\"id\":\"$WID\",\"gridX\":0,\"gridY\":0,\"gridW\":12,\"gridH\":2},{\"id\":\"$WID2\",\"gridX\":0,\"gridY\":2,\"gridW\":4,\"gridH\":3}]}")
if [ "$LAYOUT" = "200" ] || [ "$LAYOUT" = "201" ]; then echo "PASS layout_save ($LAYOUT)"; PASS=$((PASS+1)); else echo "FAIL layout_save got=$LAYOUT"; cat /tmp/p3w6_layout.json; FAIL=$((FAIL+1)); fi

DATA=$(curl -sk -o /tmp/p3w6_data.json -w '%{http_code}' "$API/dashboards/${DID}/data" -H "Authorization: Bearer $TOKEN")
check dashboard_data 200 "$DATA"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p3w6_data.json'))
assert 'widgets' in d and len(d['widgets']) >= 1
print('PASS data_widgets')
PY
PASS=$((PASS+1))

SHARE=$(curl -sk -o /tmp/p3w6_share.json -w '%{http_code}' -X POST "$API/dashboards/${DID}/shares" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"principalType":"role","principalId":"viewer","permission":"view"}')
if [ "$SHARE" = "201" ] || [ "$SHARE" = "200" ]; then echo "PASS share ($SHARE)"; PASS=$((PASS+1)); else echo "FAIL share"; cat /tmp/p3w6_share.json; FAIL=$((FAIL+1)); fi

SIGN2=$(curl -sk -o /tmp/p3w6_signup2.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p3w6.other.${SUFFIX}@opsedge360.internal\",\"password\":\"P3W6Val!${SUFFIX}\",\"name\":\"P3W6b\",\"organizationName\":\"P3W6 Other ${SUFFIX}\"}")
TOKEN2=$(python3 -c "import json;print(json.load(open('/tmp/p3w6_signup2.json')).get('accessToken') or '')")
XT=$(curl -sk -o /dev/null -w '%{http_code}' "$API/dashboards/${DID}" -H "Authorization: Bearer $TOKEN2")
if [ "$XT" = "404" ] || [ "$XT" = "403" ] || [ "$XT" = "400" ]; then echo "PASS cross_tenant_dash ($XT)"; PASS=$((PASS+1)); else echo "FAIL cross_tenant_dash got=$XT"; FAIL=$((FAIL+1)); fi

DEL=$(curl -sk -o /dev/null -w '%{http_code}' -X DELETE "$API/dashboards/${DID}" -H "Authorization: Bearer $TOKEN")
if [ "$DEL" = "200" ] || [ "$DEL" = "204" ]; then echo "PASS dashboard_delete ($DEL)"; PASS=$((PASS+1)); else echo "FAIL dashboard_delete got=$DEL"; FAIL=$((FAIL+1)); fi

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo P3_WAVE6_VALIDATION_OK
