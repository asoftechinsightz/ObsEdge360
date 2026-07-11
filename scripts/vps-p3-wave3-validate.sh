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

echo "=== Phase 3 Wave 3 validation @ $API ==="
echo "git: $(cd /opt/OpsEdge360 && git log -1 --oneline)"

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

DJ=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='discovery_jobs';" | tr -d '[:space:]')
check migration_024 1 "${DJ:-0}"

VIEW=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.views WHERE table_name='ci_relationships';" | tr -d '[:space:]')
check ci_relationships_view 1 "${VIEW:-0}"

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/p3w3_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p3w3.valid.${SUFFIX}@opsedge360.internal\",\"password\":\"P3W3Val!${SUFFIX}\",\"name\":\"P3W3\",\"organizationName\":\"P3W3 Val ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/p3w3_signup.json')).get('accessToken') or '')")

PR=$(curl -sk -o /tmp/p3w3_prov.json -w '%{http_code}' "$API/discovery/providers" -H "Authorization: Bearer $TOKEN")
check providers 200 "$PR"
python3 - <<'PY'
import json
p=json.load(open('/tmp/p3w3_prov.json'))
assert 'docker' in p.get('protocols',[])
assert 'database' in p.get('protocols',[])
print('PASS providers_include_new')
PY
PASS=$((PASS+1))

CONN=$(curl -sk -o /tmp/p3w3_conn.json -w '%{http_code}' -X POST "$API/discovery/connectors" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"name\":\"static-w3-${SUFFIX}\",\"protocol\":\"static\",\"config\":{\"prefix\":\"w3${SUFFIX}\"},\"enabled\":true}")
if [ "$CONN" = "201" ] || [ "$CONN" = "200" ]; then echo "PASS connector_create ($CONN)"; PASS=$((PASS+1)); else echo "FAIL connector_create"; cat /tmp/p3w3_conn.json; FAIL=$((FAIL+1)); fi
CID=$(python3 -c "import json;d=json.load(open('/tmp/p3w3_conn.json'));print(d.get('id') or d.get('connector',{}).get('id') or '')")

JOB=$(curl -sk -o /tmp/p3w3_job.json -w '%{http_code}' -X POST "$API/discovery/jobs" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"name\":\"job-${SUFFIX}\",\"jobType\":\"on_demand\",\"connectorIds\":[\"$CID\"],\"parallelWorkers\":1}")
if [ "$JOB" = "201" ] || [ "$JOB" = "200" ]; then echo "PASS job_create ($JOB)"; PASS=$((PASS+1)); else echo "FAIL job_create"; cat /tmp/p3w3_job.json; FAIL=$((FAIL+1)); fi
JID=$(python3 -c "import json;print(json.load(open('/tmp/p3w3_job.json')).get('id') or '')")

RUN=$(curl -sk -o /tmp/p3w3_run.json -w '%{http_code}' -X POST "$API/discovery/jobs/${JID}/run" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
if [ "$RUN" = "201" ] || [ "$RUN" = "200" ]; then echo "PASS job_run ($RUN)"; PASS=$((PASS+1)); else echo "FAIL job_run"; cat /tmp/p3w3_run.json; FAIL=$((FAIL+1)); fi

RUNS=$(curl -sk -o /tmp/p3w3_runs.json -w '%{http_code}' "$API/discovery/runs" -H "Authorization: Bearer $TOKEN")
check runs_list 200 "$RUNS"
RID=$(python3 -c "import json;runs=json.load(open('/tmp/p3w3_runs.json')).get('runs') or [];print(runs[0]['id'] if runs else '')")

RES=$(curl -sk -o /dev/null -w '%{http_code}' "$API/discovery/results?runId=${RID}" -H "Authorization: Bearer $TOKEN")
check results 200 "$RES"

ASSETS=$(curl -sk -o /dev/null -w '%{http_code}' "$API/cmdb/assets" -H "Authorization: Bearer $TOKEN")
check cmdb_assets 200 "$ASSETS"

RELS=$(curl -sk -o /dev/null -w '%{http_code}' "$API/cmdb/relationships" -H "Authorization: Bearer $TOKEN")
check cmdb_relationships 200 "$RELS"

TOPO=$(curl -sk -o /dev/null -w '%{http_code}' -X POST "$API/cmdb/topology/infrastructure/refresh" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
if [ "$TOPO" = "200" ] || [ "$TOPO" = "201" ]; then echo "PASS topology_refresh ($TOPO)"; PASS=$((PASS+1)); else echo "FAIL topology_refresh got=$TOPO"; FAIL=$((FAIL+1)); fi

DRIFT=$(curl -sk -o /dev/null -w '%{http_code}' "$API/cmdb/drift" -H "Authorization: Bearer $TOKEN")
check cmdb_drift 200 "$DRIFT"

# Cross-tenant job isolation
SIGN2=$(curl -sk -o /tmp/p3w3_signup2.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p3w3.other.${SUFFIX}@opsedge360.internal\",\"password\":\"P3W3Val!${SUFFIX}\",\"name\":\"P3W3b\",\"organizationName\":\"P3W3 Other ${SUFFIX}\"}")
TOKEN2=$(python3 -c "import json;print(json.load(open('/tmp/p3w3_signup2.json')).get('accessToken') or '')")
XT=$(curl -sk -o /dev/null -w '%{http_code}' -X POST "$API/discovery/jobs/${JID}/run" \
  -H "Authorization: Bearer $TOKEN2" -H 'Content-Type: application/json' -d '{}')
if [ "$XT" = "400" ] || [ "$XT" = "404" ] || [ "$XT" = "403" ]; then echo "PASS cross_tenant_job ($XT)"; PASS=$((PASS+1)); else echo "FAIL cross_tenant_job got=$XT"; FAIL=$((FAIL+1)); fi

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo P3_WAVE3_VALIDATION_OK
