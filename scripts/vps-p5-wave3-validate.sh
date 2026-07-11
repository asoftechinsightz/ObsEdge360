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

echo "=== Phase 5 Wave 3 validation @ $API ==="
echo "git: $(cd /opt/OpsEdge360 && git log -1 --oneline)"

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

TAB=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='platform_quotas';" | tr -d '[:space:]')
check migration_035_quotas 1 "${TAB:-0}"

SEC=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='security_policies';" | tr -d '[:space:]')
check migration_035_security_policies 1 "${SEC:-0}"

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/p5w3_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p5w3.admin.${SUFFIX}@opsedge360.internal\",\"password\":\"P5W3Val!${SUFFIX}\",\"name\":\"P5W3 Admin\",\"organizationName\":\"P5W3 Org ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/p5w3_signup.json')).get('accessToken') or '')")

# Weak password rejected when complexity enabled
curl -sk -o /dev/null -X PUT "$API/admin/security-policies/password" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"minLength":12,"requireComplexity":true,"maxFailedAttempts":5,"lockoutMinutes":15}'
WEAK=$(curl -sk -o /tmp/p5w3_weak.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p5w3.weak.${SUFFIX}@opsedge360.internal\",\"password\":\"short\",\"name\":\"Weak\",\"organizationName\":\"P5W3 Weak ${SUFFIX}\"}")
# signup creates new tenant with default policy (min 8) — short still fails length
if [ "$WEAK" = "400" ]; then echo "PASS weak_password_rejected ($WEAK)"; PASS=$((PASS+1)); else echo "FAIL weak_password_rejected got=$WEAK"; cat /tmp/p5w3_weak.json; FAIL=$((FAIL+1)); fi

PL=$(curl -sk -o /tmp/p5w3_pl.json -w '%{http_code}' "$API/admin/platform" -H "Authorization: Bearer $TOKEN")
check admin_platform 200 "$PL"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w3_pl.json'))
assert d.get('gaClaim') is False
assert d.get('wave')=='v1.0.0-wave3'
print('PASS platform_shape')
PY
PASS=$((PASS+1))

PH=$(curl -sk -o /tmp/p5w3_ph.json -w '%{http_code}' "$API/admin/platform-health" -H "Authorization: Bearer $TOKEN")
check platform_health 200 "$PH"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w3_ph.json'))
assert isinstance(d.get('overallScore'), (int,float))
assert d.get('gaClaim') is False
print('PASS platform_health_score')
PY
PASS=$((PASS+1))

Q=$(curl -sk -o /tmp/p5w3_q.json -w '%{http_code}' -X PUT "$API/admin/quotas/configuration_items" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"softLimit":5,"hardLimit":10,"warnPct":80}')
if [ "$Q" = "200" ] || [ "$Q" = "201" ]; then echo "PASS quota_upsert ($Q)"; PASS=$((PASS+1)); else echo "FAIL quota_upsert"; cat /tmp/p5w3_q.json; FAIL=$((FAIL+1)); fi

QE=$(curl -sk -o /tmp/p5w3_qe.json -w '%{http_code}' "$API/admin/quotas/evaluate" -H "Authorization: Bearer $TOKEN")
check quotas_evaluate 200 "$QE"

CAP=$(curl -sk -o /tmp/p5w3_cap.json -w '%{http_code}' "$API/admin/capacity" -H "Authorization: Bearer $TOKEN")
check capacity 200 "$CAP"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w3_cap.json'))
assert 'metrics' in d and 'score' in d
print('PASS capacity_shape')
PY
PASS=$((PASS+1))

ST=$(curl -sk -o /tmp/p5w3_st.json -w '%{http_code}' "$API/admin/storage" -H "Authorization: Bearer $TOKEN")
check storage 200 "$ST"

SP=$(curl -sk -o /tmp/p5w3_sp.json -w '%{http_code}' "$API/admin/security-policies" -H "Authorization: Bearer $TOKEN")
check security_policies 200 "$SP"

SET=$(curl -sk -o /tmp/p5w3_set.json -w '%{http_code}' -X PUT "$API/admin/settings/platform" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"telemetryRetentionDays":30,"auditRetentionDays":365}')
if [ "$SET" = "200" ] || [ "$SET" = "201" ]; then echo "PASS settings_platform ($SET)"; PASS=$((PASS+1)); else echo "FAIL settings_platform"; FAIL=$((FAIL+1)); fi

LS=$(curl -sk -o /tmp/p5w3_ls.json -w '%{http_code}' "$API/admin/licenses/status" -H "Authorization: Bearer $TOKEN")
check licenses_status 200 "$LS"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w3_ls.json'))
assert d.get('enforcement')=='non_disruptive'
print('PASS license_non_disruptive')
PY
PASS=$((PASS+1))

GA=$(curl -sk -o /tmp/p5w3_ga.json -w '%{http_code}' "$API/admin/governance/audit" -H "Authorization: Bearer $TOKEN")
check governance_audit 200 "$GA"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w3_ga.json'))
assert len(d.get('events') or []) >= 1
print('PASS governance_audit_has_events')
PY
PASS=$((PASS+1))

SESS=$(curl -sk -o /dev/null -w '%{http_code}' "$API/admin/sessions" -H "Authorization: Bearer $TOKEN")
check sessions 200 "$SESS"

UA=$(curl -sk -o /dev/null -w '%{http_code}' "$API/admin/platform")
if [ "$UA" = "401" ] || [ "$UA" = "403" ]; then echo "PASS platform_unauth ($UA)"; PASS=$((PASS+1)); else echo "FAIL platform_unauth got=$UA"; FAIL=$((FAIL+1)); fi

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo P5_WAVE3_VALIDATION_OK
