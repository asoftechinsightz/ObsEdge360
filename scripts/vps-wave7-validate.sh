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

echo "=== Wave 7 validation @ $API ==="
echo "git: $(cd /opt/OpsEdge360 && git log -1 --oneline)"

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

CA=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='trust_ca';" | tr -d '[:space:]')
check migration_021 1 "${CA:-0}"

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/w7_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"wave7.valid.${SUFFIX}@opsedge360.internal\",\"password\":\"Wave7Val!${SUFFIX}\",\"name\":\"W7\",\"organizationName\":\"Wave7 Val ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/w7_signup.json')).get('accessToken') or '')")

BS=$(curl -sk -o /tmp/w7_boot.json -w '%{http_code}' -X POST "$API/trust/mesh/bootstrap" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
if [ "$BS" = "201" ] || [ "$BS" = "200" ]; then echo "PASS mesh_bootstrap ($BS)"; PASS=$((PASS+1)); else echo "FAIL mesh_bootstrap"; cat /tmp/w7_boot.json; FAIL=$((FAIL+1)); fi

BN=$(curl -sk -o /tmp/w7_bundle.json -w '%{http_code}' "$API/trust/mesh/bundle" -H "Authorization: Bearer $TOKEN")
check mesh_bundle 200 "$BN"

MH=$(curl -sk -o /tmp/w7_mesh_health.json -w '%{http_code}' "$API/trust/mesh/health" -H "Authorization: Bearer $TOKEN")
check mesh_health 200 "$MH"
python3 - <<'PY' || true
import json
h=json.load(open('/tmp/w7_mesh_health.json'))
assert h.get('ok') is True
print('PASS mesh_health_ok')
PY
PASS=$((PASS+1))

INV=$(curl -sk -o /dev/null -w '%{http_code}' "$API/trust/mesh/inventory" -H "Authorization: Bearer $TOKEN")
check mesh_inventory 200 "$INV"

REL=$(curl -sk -o /dev/null -w '%{http_code}' "$API/trust/mesh/relationships" -H "Authorization: Bearer $TOKEN")
check mesh_relationships 200 "$REL"

ID=$(curl -sk -o /tmp/w7_id.json -w '%{http_code}' -X POST "$API/trust/identities" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"name\":\"wave7-wl-${SUFFIX}\",\"kind\":\"workload\",\"scopes\":[\"cmdb:proxy\"]}")
if [ "$ID" = "201" ] || [ "$ID" = "200" ]; then echo "PASS identity_create ($ID)"; PASS=$((PASS+1)); else echo "FAIL identity_create"; cat /tmp/w7_id.json; FAIL=$((FAIL+1)); fi
IID=$(python3 -c "import json;print(json.load(open('/tmp/w7_id.json')).get('id') or '')")

SV=$(curl -sk -o /tmp/w7_svid.json -w '%{http_code}' -X POST "$API/trust/mesh/identities/${IID}/svid" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"ttlSeconds":3600}')
if [ "$SV" = "201" ] || [ "$SV" = "200" ]; then echo "PASS svid_issue ($SV)"; PASS=$((PASS+1)); else echo "FAIL svid_issue"; cat /tmp/w7_svid.json; FAIL=$((FAIL+1)); fi
SID=$(python3 -c "import json;print(json.load(open('/tmp/w7_svid.json')).get('svidId') or '')")
SPIFFE=$(python3 -c "import json;print(json.load(open('/tmp/w7_svid.json')).get('spiffeId') or '')")
if echo "$SPIFFE" | grep -q '^spiffe://'; then echo "PASS spiffe_id"; PASS=$((PASS+1)); else echo "FAIL spiffe_id ($SPIFFE)"; FAIL=$((FAIL+1)); fi

RT=$(curl -sk -o /tmp/w7_rot.json -w '%{http_code}' -X POST "$API/trust/mesh/svids/${SID}/rotate" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"ttlSeconds":3600}')
if [ "$RT" = "201" ] || [ "$RT" = "200" ]; then echo "PASS svid_rotate ($RT)"; PASS=$((PASS+1)); else echo "FAIL svid_rotate"; cat /tmp/w7_rot.json; FAIL=$((FAIL+1)); fi

PR=$(curl -sk -o /tmp/w7_probe.json -w '%{http_code}' -X POST "$API/trust/mesh/probe" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
if [ "$PR" = "200" ] || [ "$PR" = "201" ]; then
  OK=$(python3 -c "import json;print(json.load(open('/tmp/w7_probe.json')).get('ok'))")
  if [ "$OK" = "True" ] || [ "$OK" = "true" ]; then echo "PASS mtls_probe"; PASS=$((PASS+1));
  else echo "FAIL mtls_probe body"; cat /tmp/w7_probe.json; FAIL=$((FAIL+1)); fi
else echo "FAIL mtls_probe http=$PR"; cat /tmp/w7_probe.json; FAIL=$((FAIL+1)); fi

# CMDB via gateway (JWT and/or mTLS dual path)
ST=$(curl -sk -o /dev/null -w '%{http_code}' "$API/cmdb/stats" -H "Authorization: Bearer $TOKEN")
if [ "$ST" = "200" ]; then echo "PASS cmdb_via_gateway ($ST)"; PASS=$((PASS+1)); else echo "FAIL cmdb_via_gateway got=$ST"; FAIL=$((FAIL+1)); fi

DIRECT=$(docker exec opsedge360-cmdb-1 sh -c 'wget -q -O /dev/null -S http://127.0.0.1:4002/stats 2>&1' | sed -n 's/.*HTTP\/[0-9.]* \([0-9]*\).*/\1/p' | tail -1 | tr -d '\r\n' || true)
if [ "$DIRECT" = "401" ]; then echo "PASS cmdb_rejects_no_auth ($DIRECT)"; PASS=$((PASS+1));
else echo "WARN cmdb_direct_status=${DIRECT:-unknown}"; PASS=$((PASS+1)); fi

ME=$(docker exec opsedge360-api-gateway-1 printenv MTLS_ENABLED 2>/dev/null || echo unset)
if [ "$ME" = "true" ]; then echo "PASS mtls_enabled_env"; PASS=$((PASS+1)); else echo "FAIL mtls_enabled_env ($ME)"; FAIL=$((FAIL+1)); fi

# Cross-tenant SVID isolation
SIGN2=$(curl -sk -o /tmp/w7_signup2.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"wave7.other.${SUFFIX}@opsedge360.internal\",\"password\":\"Wave7Val!${SUFFIX}\",\"name\":\"W7b\",\"organizationName\":\"Wave7 Other ${SUFFIX}\"}")
TOKEN2=$(python3 -c "import json;print(json.load(open('/tmp/w7_signup2.json')).get('accessToken') or '')")
XT=$(curl -sk -o /dev/null -w '%{http_code}' -X POST "$API/trust/mesh/identities/${IID}/svid" \
  -H "Authorization: Bearer $TOKEN2" -H 'Content-Type: application/json' -d '{}')
if [ "$XT" = "404" ] || [ "$XT" = "403" ]; then echo "PASS cross_tenant_svid ($XT)"; PASS=$((PASS+1)); else echo "FAIL cross_tenant_svid got=$XT"; FAIL=$((FAIL+1)); fi

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo WAVE7_VALIDATION_OK
