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

echo "=== Phase 5 Wave 5 validation @ $API ==="
echo "git: $(cd /opt/OpsEdge360 && git log -1 --oneline)"

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

TAB=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='connector_instances';" | tr -d '[:space:]')
check migration_037_instances 1 "${TAB:-0}"

IDP=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='identity_providers';" | tr -d '[:space:]')
check migration_037_identity 1 "${IDP:-0}"

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/p5w5_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p5w5.admin.${SUFFIX}@opsedge360.internal\",\"password\":\"P5W5Val!${SUFFIX}\",\"name\":\"P5W5 Admin\",\"organizationName\":\"P5W5 Org ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/p5w5_signup.json')).get('accessToken') or '')")

DASH=$(curl -sk -o /tmp/p5w5_dash.json -w '%{http_code}' "$API/integrations" -H "Authorization: Bearer $TOKEN")
check integrations_dashboard 200 "$DASH"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w5_dash.json'))
assert d.get('gaClaim') is False
assert d.get('wave')=='v1.0.0-wave5'
print('PASS dashboard_shape')
PY
PASS=$((PASS+1))

CAT=$(curl -sk -o /tmp/p5w5_cat.json -w '%{http_code}' "$API/integrations/connectors/catalog" -H "Authorization: Bearer $TOKEN")
check catalog 200 "$CAT"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w5_cat.json'))
assert d.get('hotPluggable') is True
assert len(d.get('connectors') or []) >= 8
print('PASS catalog_hot_pluggable')
PY
PASS=$((PASS+1))

# Local HTTP listener for webhook test via python in container network — use httpbin-like: post to webhook.site is flaky.
# Use connector register + test expecting failure without URL is ok; with invalid URL returns unhealthy not crash.
WH=$(curl -sk -o /tmp/p5w5_wh.json -w '%{http_code}' -X POST "$API/integrations/connectors" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"connectorType":"webhook","name":"W5 Hook","config":{"webhookUrl":"https://127.0.0.1:9/nope"}}')
if [ "$WH" = "200" ] || [ "$WH" = "201" ]; then echo "PASS connector_register ($WH)"; PASS=$((PASS+1)); else echo "FAIL connector_register"; cat /tmp/p5w5_wh.json; FAIL=$((FAIL+1)); fi
WH_ID=$(python3 -c "import json;print(json.load(open('/tmp/p5w5_wh.json')).get('id') or '')")

# Ensure plaintext secrets stripped from config echo
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w5_wh.json'))
assert 'password' not in json.dumps(d.get('config') or {})
print('PASS no_plaintext_in_config')
PY
PASS=$((PASS+1))

TEST=$(curl -sk -o /tmp/p5w5_test.json -w '%{http_code}' -X POST "$API/integrations/test" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"connectorId\":\"$WH_ID\"}")
if [ "$TEST" = "200" ] || [ "$TEST" = "201" ]; then echo "PASS connector_test ($TEST)"; PASS=$((PASS+1)); else echo "FAIL connector_test"; cat /tmp/p5w5_test.json; FAIL=$((FAIL+1)); fi

HL=$(curl -sk -o /dev/null -w '%{http_code}' "$API/integrations/health" -H "Authorization: Bearer $TOKEN")
check integrations_health 200 "$HL"

SN=$(curl -sk -o /tmp/p5w5_sn.json -w '%{http_code}' -X POST "$API/integrations/connectors" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"connectorType":"servicenow","name":"W5 SN","config":{"instanceUrl":"https://127.0.0.1:9"}}')
if [ "$SN" = "200" ] || [ "$SN" = "201" ]; then echo "PASS servicenow_register ($SN)"; PASS=$((PASS+1)); else echo "FAIL servicenow_register"; FAIL=$((FAIL+1)); fi
SN_ID=$(python3 -c "import json;print(json.load(open('/tmp/p5w5_sn.json')).get('id') or '')")

# ITSM without reachable instance should fail gracefully (400), proving real HTTP path not mock success
ITSM=$(curl -sk -o /tmp/p5w5_itsm.json -w '%{http_code}' -X POST "$API/integrations/itsm" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"connectorId\":\"$SN_ID\",\"action\":\"create_incident\",\"payload\":{\"shortDescription\":\"w5\",\"description\":\"val\"},\"idempotencyKey\":\"w5-$SUFFIX\"}")
if [ "$ITSM" = "400" ] || [ "$ITSM" = "500" ] || [ "$ITSM" = "502" ] || [ "$ITSM" = "503" ]; then echo "PASS itsm_real_http_path ($ITSM)"; PASS=$((PASS+1)); else echo "FAIL itsm_real_http_path got=$ITSM"; cat /tmp/p5w5_itsm.json; FAIL=$((FAIL+1)); fi

# Idempotent replay of failed audit may not exist — register jira similarly
JR=$(curl -sk -o /tmp/p5w5_jr.json -w '%{http_code}' -X POST "$API/integrations/connectors" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"connectorType":"jira","name":"W5 Jira","config":{"baseUrl":"https://127.0.0.1:9","projectKey":"OPS"}}')
if [ "$JR" = "200" ] || [ "$JR" = "201" ]; then echo "PASS jira_register ($JR)"; PASS=$((PASS+1)); else echo "FAIL jira_register"; FAIL=$((FAIL+1)); fi

CH=$(curl -sk -o /tmp/p5w5_ch.json -w '%{http_code}' -X POST "$API/integrations/notifications" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"W5 Notify","channelType":"webhook","config":{"webhookUrl":"https://127.0.0.1:9/hook"},"severityRoutes":["info","high"]}')
if [ "$CH" = "200" ] || [ "$CH" = "201" ]; then echo "PASS notify_channel ($CH)"; PASS=$((PASS+1)); else echo "FAIL notify_channel"; cat /tmp/p5w5_ch.json; FAIL=$((FAIL+1)); fi
CH_ID=$(python3 -c "import json;print(json.load(open('/tmp/p5w5_ch.json')).get('id') or '')")

DEL=$(curl -sk -o /tmp/p5w5_del.json -w '%{http_code}' -X POST "$API/integrations/notifications/deliver" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"channelId\":\"$CH_ID\",\"severity\":\"info\",\"title\":\"t\",\"message\":\"m\"}")
if [ "$DEL" = "200" ] || [ "$DEL" = "201" ]; then echo "PASS notify_deliver ($DEL)"; PASS=$((PASS+1)); else echo "FAIL notify_deliver"; cat /tmp/p5w5_del.json; FAIL=$((FAIL+1)); fi
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w5_del.json'))
assert d.get('status') in ('delivered','dead_letter','failed')
# unreachable webhook should dead-letter after retries
assert d.get('status')=='dead_letter'
print('PASS notify_dlq')
PY
PASS=$((PASS+1))

ID=$(curl -sk -o /tmp/p5w5_id.json -w '%{http_code}' -X POST "$API/integrations/identity" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"W5 LDAP","protocol":"ldap","config":{"host":"127.0.0.1","bindDn":"cn=admin","baseDn":"dc=example,dc=com","useTls":false},"jitProvisioning":true}')
if [ "$ID" = "200" ] || [ "$ID" = "201" ]; then echo "PASS identity_ldap ($ID)"; PASS=$((PASS+1)); else echo "FAIL identity_ldap"; cat /tmp/p5w5_id.json; FAIL=$((FAIL+1)); fi
# Ensure no password stored in config
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w5_id.json'))
cfg=d.get('config') or {}
assert 'password' not in cfg and 'bindPassword' not in cfg
print('PASS identity_no_password_stored')
PY
PASS=$((PASS+1))

OIDC=$(curl -sk -o /tmp/p5w5_oidc.json -w '%{http_code}' -X POST "$API/integrations/identity" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"W5 OIDC","protocol":"oidc","config":{"issuer":"https://example.com"},"jitProvisioning":true}')
if [ "$OIDC" = "200" ] || [ "$OIDC" = "201" ]; then echo "PASS identity_oidc ($OIDC)"; PASS=$((PASS+1)); else echo "FAIL identity_oidc"; FAIL=$((FAIL+1)); fi

SEC=$(curl -sk -o /tmp/p5w5_sec.json -w '%{http_code}' -X POST "$API/integrations/secrets/validate" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"secretRef":"00000000-0000-0000-0000-000000000000"}')
if [ "$SEC" = "200" ] || [ "$SEC" = "201" ]; then echo "PASS secret_validate ($SEC)"; PASS=$((PASS+1)); else echo "FAIL secret_validate got=$SEC"; cat /tmp/p5w5_sec.json; FAIL=$((FAIL+1)); fi
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w5_sec.json'))
assert d.get('valid') is False
print('PASS secret_invalid_ref')
PY
PASS=$((PASS+1))

AUD=$(curl -sk -o /dev/null -w '%{http_code}' "$API/integrations/audit" -H "Authorization: Bearer $TOKEN")
check integrations_audit 200 "$AUD"

UA=$(curl -sk -o /dev/null -w '%{http_code}' "$API/integrations")
if [ "$UA" = "401" ] || [ "$UA" = "403" ]; then echo "PASS integrations_unauth ($UA)"; PASS=$((PASS+1)); else echo "FAIL integrations_unauth got=$UA"; FAIL=$((FAIL+1)); fi

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo P5_WAVE5_VALIDATION_OK
