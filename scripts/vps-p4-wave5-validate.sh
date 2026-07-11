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

echo "=== Phase 4 Wave 5 validation @ $API ==="
echo "git: $(cd /opt/OpsEdge360 && git log -1 --oneline)"

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

TAB=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='kg_entities';" | tr -d '[:space:]')
check migration_032_entities 1 "${TAB:-0}"

CONV=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='ai_conversation_sessions';" | tr -d '[:space:]')
check migration_032_conversations 1 "${CONV:-0}"

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/p4w5_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p4w5.valid.${SUFFIX}@opsedge360.internal\",\"password\":\"P4W5Val!${SUFFIX}\",\"name\":\"P4W5\",\"organizationName\":\"P4W5 Val ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/p4w5_signup.json')).get('accessToken') or '')")
TENANT_SLUG=$(python3 -c "import json;print(json.load(open('/tmp/p4w5_signup.json')).get('user',{}).get('tenantId') or '')")

TID=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT id FROM tenants WHERE slug='${TENANT_SLUG}' LIMIT 1;" | tr -d '[:space:]')
if [ -n "$TID" ]; then
  CI1=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -qtAc \
    "INSERT INTO configuration_items (tenant_id, external_id, name, ci_type, status, health_score)
     VALUES ('$TID','w5-api-${SUFFIX}','payments-api','service','active',70) RETURNING id;" \
    | grep -Eo '[0-9a-f-]{36}' | head -1)
  CI2=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -qtAc \
    "INSERT INTO configuration_items (tenant_id, external_id, name, ci_type, status, health_score)
     VALUES ('$TID','w5-db-${SUFFIX}','payments-db','database','active',65) RETURNING id;" \
    | grep -Eo '[0-9a-f-]{36}' | head -1)
  docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c \
    "INSERT INTO relationships (tenant_id, source_ci_id, target_ci_id, relationship_type, strength)
     VALUES ('$TID','$CI1','$CI2','depends_on','normal');" >/dev/null
  docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c \
    "INSERT INTO ops_incidents (tenant_id, title, severity, status, window_start, window_end, primary_ci_id, signal_counts)
     VALUES ('$TID','W5 payments degradation ${SUFFIX}','high','open',NOW()-INTERVAL '1 hour',NOW(),'$CI1','{\"total\":2}'::jsonb);" >/dev/null
  echo "PASS seed_cmdb_graph"; PASS=$((PASS+1))
else
  echo "FAIL seed_cmdb_graph"; FAIL=$((FAIL+1))
fi

SYNC=$(curl -sk -o /tmp/p4w5_sync.json -w '%{http_code}' -X POST "$API/ai/graph/sync" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
if [ "$SYNC" = "201" ] || [ "$SYNC" = "200" ]; then echo "PASS graph_sync ($SYNC)"; PASS=$((PASS+1)); else echo "FAIL graph_sync"; cat /tmp/p4w5_sync.json; FAIL=$((FAIL+1)); fi
python3 - <<'PY'
import json
d=json.load(open('/tmp/p4w5_sync.json'))
assert d.get('entitiesUpserted',0) >= 2, d
assert d.get('edgesUpserted',0) >= 1, d
print('PASS graph_sync_shape')
PY
PASS=$((PASS+1))

ST=$(curl -sk -o /tmp/p4w5_st.json -w '%{http_code}' "$API/ai/graph/stats" -H "Authorization: Bearer $TOKEN")
check graph_stats 200 "$ST"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p4w5_st.json'))
assert d.get('entities',0) >= 2
assert d.get('edges',0) >= 1
print('PASS graph_stats_shape')
PY
PASS=$((PASS+1))

NB=$(curl -sk -o /tmp/p4w5_nb.json -w '%{http_code}' "$API/ai/graph/neighborhood?q=payments-api" -H "Authorization: Bearer $TOKEN")
check graph_neighborhood 200 "$NB"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p4w5_nb.json'))
assert d.get('root') is not None, d
assert len(d.get('nodes') or []) >= 1
print('PASS neighborhood_shape')
PY
PASS=$((PASS+1))

COP=$(curl -sk -o /tmp/p4w5_cop.json -w '%{http_code}' -X POST "$API/ai/copilot" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"question\":\"What depends on payments-api ${SUFFIX}?\"}")
if [ "$COP" = "200" ] || [ "$COP" = "201" ]; then echo "PASS copilot_graph ($COP)"; PASS=$((PASS+1)); else echo "FAIL copilot_graph"; cat /tmp/p4w5_cop.json; FAIL=$((FAIL+1)); fi
SID=$(python3 -c "import json;print(json.load(open('/tmp/p4w5_cop.json')).get('sessionId') or '')")
python3 - <<'PY'
import json
d=json.load(open('/tmp/p4w5_cop.json'))
assert d.get('reply')
assert d.get('mode') in ('llm','evidence-synthesis')
assert d.get('sessionId')
assert d.get('model')
cites=d.get('citations') or []
assert any((c.get('sourceType')=='knowledge_graph') or str(c.get('title','')).startswith('KG:') for c in cites), cites
print('PASS copilot_graph_citations')
PY
PASS=$((PASS+1))

# Multi-turn
COP2=$(curl -sk -o /tmp/p4w5_cop2.json -w '%{http_code}' -X POST "$API/ai/copilot" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"question\":\"Summarize the blast impact for that service ${SUFFIX}\",\"sessionId\":\"${SID}\"}")
if [ "$COP2" = "200" ] || [ "$COP2" = "201" ]; then echo "PASS copilot_multiturn ($COP2)"; PASS=$((PASS+1)); else echo "FAIL copilot_multiturn"; cat /tmp/p4w5_cop2.json; FAIL=$((FAIL+1)); fi

CG=$(curl -sk -o /tmp/p4w5_cg.json -w '%{http_code}' "$API/ai/conversations/${SID}" -H "Authorization: Bearer $TOKEN")
check conversation_get 200 "$CG"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p4w5_cg.json'))
assert len(d.get('messages') or []) >= 2
print('PASS conversation_messages')
PY
PASS=$((PASS+1))

RCA=$(curl -sk -o /tmp/p4w5_rca.json -w '%{http_code}' -X POST "$API/ai/rca" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"question\":\"Why is payments-api degraded ${SUFFIX}?\"}")
if [ "$RCA" = "201" ] || [ "$RCA" = "200" ]; then echo "PASS grounded_rca ($RCA)"; PASS=$((PASS+1)); else echo "FAIL grounded_rca"; cat /tmp/p4w5_rca.json; FAIL=$((FAIL+1)); fi

# Cross-tenant
SIGN2=$(curl -sk -o /tmp/p4w5_signup2.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p4w5.other.${SUFFIX}@opsedge360.internal\",\"password\":\"P4W5Val!${SUFFIX}\",\"name\":\"P4W5b\",\"organizationName\":\"P4W5 Other ${SUFFIX}\"}")
TOKEN2=$(python3 -c "import json;print(json.load(open('/tmp/p4w5_signup2.json')).get('accessToken') or '')")
XT=$(curl -sk -o /dev/null -w '%{http_code}' "$API/ai/conversations/${SID}" -H "Authorization: Bearer $TOKEN2")
if [ "$XT" = "404" ] || [ "$XT" = "403" ] || [ "$XT" = "400" ]; then echo "PASS cross_tenant_conversation ($XT)"; PASS=$((PASS+1)); else echo "FAIL cross_tenant_conversation got=$XT"; FAIL=$((FAIL+1)); fi

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo P4_WAVE5_VALIDATION_OK
