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

echo "=== Phase 5 Wave 4 validation @ $API ==="
echo "git: $(cd /opt/OpsEdge360 && git log -1 --oneline)"

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

TAB=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='automation_workflows';" | tr -d '[:space:]')
check migration_036_workflows 1 "${TAB:-0}"

CP=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='automation_control_plane';" | tr -d '[:space:]')
check migration_036_control_plane 1 "${CP:-0}"

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/p5w4_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p5w4.admin.${SUFFIX}@opsedge360.internal\",\"password\":\"P5W4Val!${SUFFIX}\",\"name\":\"P5W4 Admin\",\"organizationName\":\"P5W4 Org ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/p5w4_signup.json')).get('accessToken') or '')")

DASH=$(curl -sk -o /tmp/p5w4_dash.json -w '%{http_code}' "$API/automation/dashboard" -H "Authorization: Bearer $TOKEN")
check automation_dashboard 200 "$DASH"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w4_dash.json'))
assert d.get('gaClaim') is False
assert d.get('autonomousProduction') is False
assert d.get('wave')=='v1.0.0-wave4'
print('PASS dashboard_shape')
PY
PASS=$((PASS+1))

RB=$(curl -sk -o /tmp/p5w4_rb.json -w '%{http_code}' "$API/automation/runbooks" -H "Authorization: Bearer $TOKEN")
check runbooks 200 "$RB"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w4_rb.json'))
assert len(d.get('runbooks') or []) >= 5
print('PASS runbook_catalog')
PY
PASS=$((PASS+1))

POL=$(curl -sk -o /tmp/p5w4_pol.json -w '%{http_code}' -X POST "$API/automation/policies" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"W4 Approval","controlMode":"approval_required","executionMode":"dry_run","requireApproval":true,"maxApprovalLevels":1}')
if [ "$POL" = "200" ] || [ "$POL" = "201" ]; then echo "PASS policy_create ($POL)"; PASS=$((PASS+1)); else echo "FAIL policy_create"; cat /tmp/p5w4_pol.json; FAIL=$((FAIL+1)); fi

BAD=$(curl -sk -o /tmp/p5w4_bad.json -w '%{http_code}' -X POST "$API/automation/policies" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Bad Auto Prod","controlMode":"auto_execute","executionMode":"production","requireApproval":false}')
if [ "$BAD" = "400" ]; then echo "PASS auto_execute_production_blocked ($BAD)"; PASS=$((PASS+1)); else echo "FAIL auto_execute_production_blocked got=$BAD"; cat /tmp/p5w4_bad.json; FAIL=$((FAIL+1)); fi

WF=$(curl -sk -o /tmp/p5w4_wf.json -w '%{http_code}' -X POST "$API/automation/workflows" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"W4 Restart WF","status":"active","definition":{"steps":[{"key":"validate","action":"validate_target","retries":1,"timeoutMs":2000},{"key":"restart","action":"restart_service","compensate":"verify_health","retries":1},{"key":"verify","action":"verify_health"}]}}')
if [ "$WF" = "200" ] || [ "$WF" = "201" ]; then echo "PASS workflow_create ($WF)"; PASS=$((PASS+1)); else echo "FAIL workflow_create"; cat /tmp/p5w4_wf.json; FAIL=$((FAIL+1)); fi
WF_ID=$(python3 -c "import json;print(json.load(open('/tmp/p5w4_wf.json')).get('id') or '')")

SIM=$(curl -sk -o /tmp/p5w4_sim.json -w '%{http_code}' -X POST "$API/automation/simulations" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"workflowId\":\"$WF_ID\"}")
if [ "$SIM" = "200" ] || [ "$SIM" = "201" ]; then echo "PASS simulation ($SIM)"; PASS=$((PASS+1)); else echo "FAIL simulation"; cat /tmp/p5w4_sim.json; FAIL=$((FAIL+1)); fi
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w4_sim.json'))
ex=d.get('execution') or {}
assert ex.get('status')=='completed'
assert ex.get('mode')=='simulation'
res=ex.get('result') or {}
assert (res.get('report') or {}).get('productionStateChanges') is False
print('PASS simulation_no_mutation')
PY
PASS=$((PASS+1))

# Emergency stop blocks new starts
ES=$(curl -sk -o /tmp/p5w4_es.json -w '%{http_code}' -X POST "$API/automation/emergency-stop" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"emergencyStop":true,"reason":"wave4 validation"}')
if [ "$ES" = "200" ] || [ "$ES" = "201" ]; then echo "PASS emergency_stop_set ($ES)"; PASS=$((PASS+1)); else echo "FAIL emergency_stop_set"; cat /tmp/p5w4_es.json; FAIL=$((FAIL+1)); fi

BLOCK=$(curl -sk -o /tmp/p5w4_block.json -w '%{http_code}' -X POST "$API/automation/workflows/$WF_ID/start" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"mode":"simulation"}')
if [ "$BLOCK" = "503" ] || [ "$BLOCK" = "409" ]; then echo "PASS e_stop_blocks_start ($BLOCK)"; PASS=$((PASS+1)); else echo "FAIL e_stop_blocks_start got=$BLOCK"; cat /tmp/p5w4_block.json; FAIL=$((FAIL+1)); fi

CLR=$(curl -sk -o /dev/null -w '%{http_code}' -X POST "$API/automation/emergency-stop" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"emergencyStop":false,"reason":"cleared"}')
if [ "$CLR" = "200" ] || [ "$CLR" = "201" ]; then echo "PASS emergency_stop_clear ($CLR)"; PASS=$((PASS+1)); else echo "FAIL emergency_stop_clear got=$CLR"; FAIL=$((FAIL+1)); fi

# Live start → awaiting approval
LIVE=$(curl -sk -o /tmp/p5w4_live.json -w '%{http_code}' -X POST "$API/automation/workflows/$WF_ID/start" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"mode":"live"}')
if [ "$LIVE" = "200" ] || [ "$LIVE" = "201" ]; then echo "PASS live_start ($LIVE)"; PASS=$((PASS+1)); else echo "FAIL live_start"; cat /tmp/p5w4_live.json; FAIL=$((FAIL+1)); fi
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w4_live.json'))
ex=d.get('execution') or {}
assert ex.get('status')=='awaiting_approval'
assert len(d.get('approvals') or []) >= 1
print('PASS live_requires_approval')
PY
PASS=$((PASS+1))

APPR_ID=$(python3 -c "import json;d=json.load(open('/tmp/p5w4_live.json'));print((d.get('approvals') or [{}])[0].get('id') or '')")
DEC=$(curl -sk -o /tmp/p5w4_dec.json -w '%{http_code}' -X POST "$API/automation/approvals/$APPR_ID/decide" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"decision":"approved","comment":"wave4 validate"}')
if [ "$DEC" = "200" ] || [ "$DEC" = "201" ]; then echo "PASS approval_decide ($DEC)"; PASS=$((PASS+1)); else echo "FAIL approval_decide"; cat /tmp/p5w4_dec.json; FAIL=$((FAIL+1)); fi

HIST=$(curl -sk -o /tmp/p5w4_hist.json -w '%{http_code}' "$API/automation/history" -H "Authorization: Bearer $TOKEN")
check history 200 "$HIST"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w4_hist.json'))
assert len(d.get('events') or []) >= 1
assert all(e.get('immutable_hash') for e in d['events'])
print('PASS history_immutable')
PY
PASS=$((PASS+1))

UA=$(curl -sk -o /dev/null -w '%{http_code}' "$API/automation/dashboard")
if [ "$UA" = "401" ] || [ "$UA" = "403" ]; then echo "PASS automation_unauth ($UA)"; PASS=$((PASS+1)); else echo "FAIL automation_unauth got=$UA"; FAIL=$((FAIL+1)); fi

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo P5_WAVE4_VALIDATION_OK
