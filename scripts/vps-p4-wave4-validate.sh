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

echo "=== Phase 4 Wave 4 validation @ $API ==="
echo "git: $(cd /opt/OpsEdge360 && git log -1 --oneline)"

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

TAB=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='remediation_action_catalog';" | tr -d '[:space:]')
check migration_031_catalog 1 "${TAB:-0}"

AUD=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='remediation_audit_events';" | tr -d '[:space:]')
check migration_031_audit 1 "${AUD:-0}"

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/p4w4_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p4w4.valid.${SUFFIX}@opsedge360.internal\",\"password\":\"P4W4Val!${SUFFIX}\",\"name\":\"P4W4\",\"organizationName\":\"P4W4 Val ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/p4w4_signup.json')).get('accessToken') or '')")

CAT=$(curl -sk -o /tmp/p4w4_cat.json -w '%{http_code}' "$API/ops-intelligence/remediation/catalog" -H "Authorization: Bearer $TOKEN")
check catalog 200 "$CAT"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p4w4_cat.json'))
assert len(d.get('catalog') or []) >= 3
print('PASS catalog_shape')
PY
PASS=$((PASS+1))

# Medium dry-run requires approval before execute
REQ=$(curl -sk -o /tmp/p4w4_req.json -w '%{http_code}' -X POST "$API/ops-intelligence/remediation/request" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"action":"Investigate and stabilize payments","actionKey":"investigate_stabilize","riskTier":"medium","executionMode":"dry_run","evidence":"w4"}')
if [ "$REQ" = "201" ] || [ "$REQ" = "200" ]; then echo "PASS rem_request ($REQ)"; PASS=$((PASS+1)); else echo "FAIL rem_request"; cat /tmp/p4w4_req.json; FAIL=$((FAIL+1)); fi
RID=$(python3 -c "import json;print(json.load(open('/tmp/p4w4_req.json')).get('id') or '')")
python3 - <<'PY'
import json
d=json.load(open('/tmp/p4w4_req.json'))
assert d.get('executionMode')=='dry_run'
assert d.get('requiresApproval') is True
assert d.get('status')=='pending'
print('PASS rem_request_shape')
PY
PASS=$((PASS+1))

EX0=$(curl -sk -o /tmp/p4w4_ex0.json -w '%{http_code}' -X POST "$API/ops-intelligence/remediation/approvals/${RID}/execute" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
# expect 400 approval required
if [ "$EX0" = "400" ]; then echo "PASS execute_blocked_without_approval ($EX0)"; PASS=$((PASS+1)); else echo "FAIL execute_blocked_without_approval got=$EX0"; cat /tmp/p4w4_ex0.json; FAIL=$((FAIL+1)); fi

AP=$(curl -sk -o /tmp/p4w4_ap.json -w '%{http_code}' -X POST "$API/ops-intelligence/remediation/approvals/${RID}/approve" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
if [ "$AP" = "200" ] || [ "$AP" = "201" ]; then echo "PASS approve ($AP)"; PASS=$((PASS+1)); else echo "FAIL approve"; cat /tmp/p4w4_ap.json; FAIL=$((FAIL+1)); fi

EX1=$(curl -sk -o /tmp/p4w4_ex1.json -w '%{http_code}' -X POST "$API/ops-intelligence/remediation/approvals/${RID}/execute" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
if [ "$EX1" = "200" ] || [ "$EX1" = "201" ]; then echo "PASS execute_dry_run ($EX1)"; PASS=$((PASS+1)); else echo "FAIL execute_dry_run"; cat /tmp/p4w4_ex1.json; FAIL=$((FAIL+1)); fi
python3 - <<'PY'
import json
d=json.load(open('/tmp/p4w4_ex1.json'))
assert d.get('status')=='executed_dry_run'
er=d.get('executionResult') or {}
if isinstance(er,str):
  er=json.loads(er)
assert er.get('simulated') is True
assert er.get('executionMode')=='dry_run'
print('PASS dry_run_result')
PY
PASS=$((PASS+1))

# Live allowlisted path
LREQ=$(curl -sk -o /tmp/p4w4_lreq.json -w '%{http_code}' -X POST "$API/ops-intelligence/remediation/request" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"action":"Restart payments-api","actionKey":"restart_service","riskTier":"medium","executionMode":"live"}')
if [ "$LREQ" = "201" ] || [ "$LREQ" = "200" ]; then echo "PASS live_request ($LREQ)"; PASS=$((PASS+1)); else echo "FAIL live_request"; cat /tmp/p4w4_lreq.json; FAIL=$((FAIL+1)); fi
LID=$(python3 -c "import json;print(json.load(open('/tmp/p4w4_lreq.json')).get('id') or '')")
python3 - <<'PY'
import json
d=json.load(open('/tmp/p4w4_lreq.json'))
assert d.get('executionMode')=='live'
assert d.get('requiresApproval') is True
print('PASS live_request_honest_mode')
PY
PASS=$((PASS+1))

curl -sk -o /tmp/p4w4_lap.json -w '%{http_code}' -X POST "$API/ops-intelligence/remediation/approvals/${LID}/approve" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}' >/dev/null
LEX=$(curl -sk -o /tmp/p4w4_lex.json -w '%{http_code}' -X POST "$API/ops-intelligence/remediation/approvals/${LID}/execute" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
if [ "$LEX" = "200" ] || [ "$LEX" = "201" ]; then echo "PASS execute_live ($LEX)"; PASS=$((PASS+1)); else echo "FAIL execute_live"; cat /tmp/p4w4_lex.json; FAIL=$((FAIL+1)); fi
python3 - <<'PY'
import json
d=json.load(open('/tmp/p4w4_lex.json'))
assert d.get('status')=='executed_live'
er=d.get('executionResult') or {}
if isinstance(er,str):
  er=json.loads(er)
assert er.get('simulated') is False
assert er.get('controlled') is True
assert er.get('allowlisted') is True
print('PASS live_result_controlled')
PY
PASS=$((PASS+1))

# Live not allowlisted rejected at request
BAD=$(curl -sk -o /tmp/p4w4_bad.json -w '%{http_code}' -X POST "$API/ops-intelligence/remediation/request" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"action":"Rollback deploy","actionKey":"rollback_deploy","riskTier":"high","executionMode":"live"}')
if [ "$BAD" = "400" ]; then echo "PASS live_disallowed_blocked ($BAD)"; PASS=$((PASS+1)); else echo "FAIL live_disallowed_blocked got=$BAD"; cat /tmp/p4w4_bad.json; FAIL=$((FAIL+1)); fi

# Low dry_run can execute without approval
LOW=$(curl -sk -o /tmp/p4w4_low.json -w '%{http_code}' -X POST "$API/ops-intelligence/remediation/request" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"action":"Clear cache","actionKey":"clear_cache","riskTier":"low","executionMode":"dry_run"}')
LOW_ID=$(python3 -c "import json;print(json.load(open('/tmp/p4w4_low.json')).get('id') or '')")
LEX2=$(curl -sk -o /tmp/p4w4_lex2.json -w '%{http_code}' -X POST "$API/ops-intelligence/remediation/approvals/${LOW_ID}/execute" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
if [ "$LEX2" = "200" ] || [ "$LEX2" = "201" ]; then echo "PASS low_dry_run_no_approval ($LEX2)"; PASS=$((PASS+1)); else echo "FAIL low_dry_run_no_approval"; cat /tmp/p4w4_lex2.json; FAIL=$((FAIL+1)); fi

AUDL=$(curl -sk -o /tmp/p4w4_aud.json -w '%{http_code}' "$API/ops-intelligence/remediation/audit?requestId=${RID}" -H "Authorization: Bearer $TOKEN")
check audit 200 "$AUDL"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p4w4_aud.json'))
assert len(d.get('events') or []) >= 2
print('PASS audit_events')
PY
PASS=$((PASS+1))

# Cross-tenant
SIGN2=$(curl -sk -o /tmp/p4w4_signup2.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p4w4.other.${SUFFIX}@opsedge360.internal\",\"password\":\"P4W4Val!${SUFFIX}\",\"name\":\"P4W4b\",\"organizationName\":\"P4W4 Other ${SUFFIX}\"}")
TOKEN2=$(python3 -c "import json;print(json.load(open('/tmp/p4w4_signup2.json')).get('accessToken') or '')")
XT=$(curl -sk -o /dev/null -w '%{http_code}' "$API/ops-intelligence/remediation/approvals/${RID}" -H "Authorization: Bearer $TOKEN2")
if [ "$XT" = "404" ] || [ "$XT" = "403" ] || [ "$XT" = "400" ]; then echo "PASS cross_tenant_remediation ($XT)"; PASS=$((PASS+1)); else echo "FAIL cross_tenant_remediation got=$XT"; FAIL=$((FAIL+1)); fi

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo P4_WAVE4_VALIDATION_OK
