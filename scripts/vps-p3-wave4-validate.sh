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

echo "=== Phase 3 Wave 4 validation @ $API ==="
echo "git: $(cd /opt/OpsEdge360 && git log -1 --oneline)"

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

INF=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='inferred_dependencies';" | tr -d '[:space:]')
check migration_025 1 "${INF:-0}"

LAYOUT=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='topology_layout_positions';" | tr -d '[:space:]')
check layout_table 1 "${LAYOUT:-0}"

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/p3w4_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p3w4.valid.${SUFFIX}@opsedge360.internal\",\"password\":\"P3W4Val!${SUFFIX}\",\"name\":\"P3W4\",\"organizationName\":\"P3W4 Val ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/p3w4_signup.json')).get('accessToken') or '')")

LAYERS=$(curl -sk -o /tmp/p3w4_layers.json -w '%{http_code}' "$API/cmdb/topology/layers" -H "Authorization: Bearer $TOKEN")
check topology_layers 200 "$LAYERS"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p3w4_layers.json'))
assert 'layers' in d and len(d['layers']) >= 5
print('PASS layers_catalog')
PY
PASS=$((PASS+1))

# Seed a CI for blast + topology
CI=$(curl -sk -o /tmp/p3w4_ci.json -w '%{http_code}' -X POST "$API/cmdb/cis" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"name\":\"topo-svc-${SUFFIX}\",\"ciType\":\"service\",\"status\":\"active\",\"attributes\":{\"service_name\":\"topo-svc-${SUFFIX}\"}}")
if [ "$CI" = "201" ] || [ "$CI" = "200" ]; then echo "PASS ci_create ($CI)"; PASS=$((PASS+1)); else echo "FAIL ci_create"; cat /tmp/p3w4_ci.json; FAIL=$((FAIL+1)); fi
CIID=$(python3 -c "import json;d=json.load(open('/tmp/p3w4_ci.json'));print(d.get('id') or d.get('ci',{}).get('id') or '')")

CI2=$(curl -sk -o /tmp/p3w4_ci2.json -w '%{http_code}' -X POST "$API/cmdb/cis" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"name\":\"topo-db-${SUFFIX}\",\"ciType\":\"database\",\"status\":\"active\"}")
CIID2=$(python3 -c "import json;d=json.load(open('/tmp/p3w4_ci2.json'));print(d.get('id') or d.get('ci',{}).get('id') or '')")
REL=$(curl -sk -o /dev/null -w '%{http_code}' -X POST "$API/cmdb/relationships" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"sourceCiId\":\"$CIID\",\"targetCiId\":\"$CIID2\",\"relationshipType\":\"depends_on\"}")
if [ "$REL" = "201" ] || [ "$REL" = "200" ]; then echo "PASS relationship_create ($REL)"; PASS=$((PASS+1)); else echo "FAIL relationship_create got=$REL"; FAIL=$((FAIL+1)); fi

SYNC=$(curl -sk -o /tmp/p3w4_sync.json -w '%{http_code}' -X POST "$API/cmdb/topology/sync-traces" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"hours":1}')
if [ "$SYNC" = "201" ] || [ "$SYNC" = "200" ]; then echo "PASS sync_traces ($SYNC)"; PASS=$((PASS+1)); else echo "FAIL sync_traces got=$SYNC"; cat /tmp/p3w4_sync.json; FAIL=$((FAIL+1)); fi

DEPS=$(curl -sk -o /dev/null -w '%{http_code}' "$API/cmdb/topology/dependencies" -H "Authorization: Bearer $TOKEN")
check dependencies 200 "$DEPS"

TOPO=$(curl -sk -o /tmp/p3w4_topo.json -w '%{http_code}' -X POST "$API/cmdb/topology/application/refresh" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
if [ "$TOPO" = "200" ] || [ "$TOPO" = "201" ]; then echo "PASS topology_refresh ($TOPO)"; PASS=$((PASS+1)); else echo "FAIL topology_refresh got=$TOPO"; FAIL=$((FAIL+1)); fi

LAYOUT=$(curl -sk -o /tmp/p3w4_layout.json -w '%{http_code}' -X POST "$API/cmdb/topology/application/layout" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"algorithm":"force-directed"}')
if [ "$LAYOUT" = "200" ] || [ "$LAYOUT" = "201" ]; then echo "PASS topology_layout ($LAYOUT)"; PASS=$((PASS+1)); else echo "FAIL topology_layout got=$LAYOUT"; cat /tmp/p3w4_layout.json; FAIL=$((FAIL+1)); fi

EV=$(curl -sk -o /tmp/p3w4_ev.json -w '%{http_code}' "$API/cmdb/topology/events" -H "Authorization: Bearer $TOKEN")
check topology_events 200 "$EV"

BLAST=$(curl -sk -o /tmp/p3w4_blast.json -w '%{http_code}' "$API/twin/blast-radius/${CIID}?depth=2&direction=downstream" \
  -H "Authorization: Bearer $TOKEN")
check blast_radius 200 "$BLAST"

# Cross-tenant: other tenant must not see our events payload incorrectly — run events with other token (empty ok) and blast on our CI should 404
SIGN2=$(curl -sk -o /tmp/p3w4_signup2.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p3w4.other.${SUFFIX}@opsedge360.internal\",\"password\":\"P3W4Val!${SUFFIX}\",\"name\":\"P3W4b\",\"organizationName\":\"P3W4 Other ${SUFFIX}\"}")
TOKEN2=$(python3 -c "import json;print(json.load(open('/tmp/p3w4_signup2.json')).get('accessToken') or '')")
XT=$(curl -sk -o /dev/null -w '%{http_code}' "$API/twin/blast-radius/${CIID}?depth=2" -H "Authorization: Bearer $TOKEN2")
if [ "$XT" = "404" ] || [ "$XT" = "403" ] || [ "$XT" = "400" ]; then echo "PASS cross_tenant_blast ($XT)"; PASS=$((PASS+1)); else echo "FAIL cross_tenant_blast got=$XT"; FAIL=$((FAIL+1)); fi

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo P3_WAVE4_VALIDATION_OK
