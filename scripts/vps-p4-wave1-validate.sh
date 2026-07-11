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

echo "=== Phase 4 Wave 1 validation @ $API ==="
echo "git: $(cd /opt/OpsEdge360 && git log -1 --oneline)"

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

TAB=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='llm_usage_events';" | tr -d '[:space:]')
check migration_028 1 "${TAB:-0}"

RAG=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='rag_chunks';" | tr -d '[:space:]')
check rag_chunks 1 "${RAG:-0}"

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/p4w1_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p4w1.valid.${SUFFIX}@opsedge360.internal\",\"password\":\"P4W1Val!${SUFFIX}\",\"name\":\"P4W1\",\"organizationName\":\"P4W1 Val ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/p4w1_signup.json')).get('accessToken') or '')")

AH=$(curl -sk -o /tmp/p4w1_ah.json -w '%{http_code}' "$API/ai/health" -H "Authorization: Bearer $TOKEN")
check ai_health 200 "$AH"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p4w1_ah.json'))
assert 'provider' in d and 'fallback' in d
print('PASS ai_health_shape')
PY
PASS=$((PASS+1))

DOC=$(curl -sk -o /tmp/p4w1_doc.json -w '%{http_code}' -X POST "$API/ai/rag/documents" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"title\":\"Runbook ${SUFFIX}\",\"content\":\"If Service A is degraded check database blast radius and recent anomalies. Restart is dry-run only.\",\"sourceType\":\"runbook\"}")
if [ "$DOC" = "201" ] || [ "$DOC" = "200" ]; then echo "PASS rag_ingest ($DOC)"; PASS=$((PASS+1)); else echo "FAIL rag_ingest"; cat /tmp/p4w1_doc.json; FAIL=$((FAIL+1)); fi

RET=$(curl -sk -o /tmp/p4w1_ret.json -w '%{http_code}' "$API/ai/rag/retrieve?q=database%20degraded" -H "Authorization: Bearer $TOKEN")
check rag_retrieve 200 "$RET"

RCA=$(curl -sk -o /tmp/p4w1_rca.json -w '%{http_code}' -X POST "$API/ai/rca" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"question\":\"Why is Service A degraded ${SUFFIX}?\"}")
if [ "$RCA" = "201" ] || [ "$RCA" = "200" ]; then echo "PASS grounded_rca ($RCA)"; PASS=$((PASS+1)); else echo "FAIL grounded_rca"; cat /tmp/p4w1_rca.json; FAIL=$((FAIL+1)); fi
RID=$(python3 -c "import json;print(json.load(open('/tmp/p4w1_rca.json')).get('id') or '')")
python3 - <<'PY'
import json
d=json.load(open('/tmp/p4w1_rca.json'))
assert d.get('summary')
assert d.get('model')
assert d.get('mode') in ('llm','evidence-synthesis')
print('PASS rca_grounded_fields')
PY
PASS=$((PASS+1))

RGET=$(curl -sk -o /dev/null -w '%{http_code}' "$API/ai/rca/${RID}" -H "Authorization: Bearer $TOKEN")
check rca_get 200 "$RGET"

COP=$(curl -sk -o /tmp/p4w1_cop.json -w '%{http_code}' -X POST "$API/ai/copilot" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"question\":\"Show the blast radius of this database outage ${SUFFIX}\"}")
if [ "$COP" = "200" ] || [ "$COP" = "201" ]; then echo "PASS copilot ($COP)"; PASS=$((PASS+1)); else echo "FAIL copilot"; cat /tmp/p4w1_cop.json; FAIL=$((FAIL+1)); fi

CORR=$(curl -sk -o /tmp/p4w1_corr.json -w '%{http_code}' -X POST "$API/ai/correlate" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
if [ "$CORR" = "201" ] || [ "$CORR" = "200" ]; then echo "PASS aiops_correlate ($CORR)"; PASS=$((PASS+1)); else echo "FAIL aiops_correlate"; cat /tmp/p4w1_corr.json; FAIL=$((FAIL+1)); fi

CL=$(curl -sk -o /dev/null -w '%{http_code}' "$API/ai/correlations" -H "Authorization: Bearer $TOKEN")
check correlations_list 200 "$CL"

# Cross-tenant
SIGN2=$(curl -sk -o /tmp/p4w1_signup2.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p4w1.other.${SUFFIX}@opsedge360.internal\",\"password\":\"P4W1Val!${SUFFIX}\",\"name\":\"P4W1b\",\"organizationName\":\"P4W1 Other ${SUFFIX}\"}")
TOKEN2=$(python3 -c "import json;print(json.load(open('/tmp/p4w1_signup2.json')).get('accessToken') or '')")
XT=$(curl -sk -o /dev/null -w '%{http_code}' "$API/ai/rca/${RID}" -H "Authorization: Bearer $TOKEN2")
if [ "$XT" = "404" ] || [ "$XT" = "403" ] || [ "$XT" = "400" ]; then echo "PASS cross_tenant_rca ($XT)"; PASS=$((PASS+1)); else echo "FAIL cross_tenant_rca got=$XT"; FAIL=$((FAIL+1)); fi

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo P4_WAVE1_VALIDATION_OK
