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

echo "=== Phase 5 Wave 1 validation @ $API ==="
echo "git: $(cd /opt/OpsEdge360 && git log -1 --oneline)"

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

TAB=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='platform_licenses';" | tr -d '[:space:]')
check migration_033_licenses 1 "${TAB:-0}"

POL=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='automation_policies';" | tr -d '[:space:]')
check migration_033_policies 1 "${POL:-0}"

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/p5w1_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p5w1.admin.${SUFFIX}@opsedge360.internal\",\"password\":\"P5W1Val!${SUFFIX}\",\"name\":\"P5W1 Admin\",\"organizationName\":\"P5W1 Org ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/p5w1_signup.json')).get('accessToken') or '')")

# Force admin role for Admin Center (signup may assign operator unless email contains admin — we used admin.)
OV=$(curl -sk -o /tmp/p5w1_ov.json -w '%{http_code}' "$API/admin/overview" -H "Authorization: Bearer $TOKEN")
check admin_overview 200 "$OV"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w1_ov.json'))
assert d.get('gaClaim') is False
assert d.get('releaseTrack')
assert 'counts' in d
print('PASS overview_shape')
PY
PASS=$((PASS+1))

LIC=$(curl -sk -o /tmp/p5w1_lic.json -w '%{http_code}' -X POST "$API/admin/licenses" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"licenseKey\":\"LIC-P5W1-${SUFFIX}-SECRET\",\"licenseTier\":\"enterprise\",\"seats\":50}")
if [ "$LIC" = "201" ] || [ "$LIC" = "200" ]; then echo "PASS license_create ($LIC)"; PASS=$((PASS+1)); else echo "FAIL license_create"; cat /tmp/p5w1_lic.json; FAIL=$((FAIL+1)); fi

POLC=$(curl -sk -o /tmp/p5w1_pol.json -w '%{http_code}' -X POST "$API/admin/automation/policies" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Wave1 dry-run","executionMode":"dry_run","requireApproval":true}')
if [ "$POLC" = "201" ] || [ "$POLC" = "200" ]; then echo "PASS policy_create ($POLC)"; PASS=$((PASS+1)); else echo "FAIL policy_create"; cat /tmp/p5w1_pol.json; FAIL=$((FAIL+1)); fi

BAD=$(curl -sk -o /tmp/p5w1_bad.json -w '%{http_code}' -X POST "$API/admin/automation/policies" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Bad prod","executionMode":"production","requireApproval":false}')
if [ "$BAD" = "400" ]; then echo "PASS production_requires_approval (400)"; PASS=$((PASS+1)); else echo "FAIL production_requires_approval got=$BAD"; FAIL=$((FAIL+1)); fi

RB=$(curl -sk -o /tmp/p5w1_rb.json -w '%{http_code}' -X POST "$API/admin/runbooks" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Wave1 runbook","steps":[{"action":"dry_run"}],"status":"active"}')
if [ "$RB" = "201" ] || [ "$RB" = "200" ]; then echo "PASS runbook_create ($RB)"; PASS=$((PASS+1)); else echo "FAIL runbook_create"; FAIL=$((FAIL+1)); fi

INT=$(curl -sk -o /tmp/p5w1_int.json -w '%{http_code}' -X POST "$API/admin/integrations" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"connectorType":"webhook","name":"Wave1 webhook"}')
if [ "$INT" = "201" ] || [ "$INT" = "200" ]; then echo "PASS integration_create ($INT)"; PASS=$((PASS+1)); else echo "FAIL integration_create"; FAIL=$((FAIL+1)); fi

BK=$(curl -sk -o /tmp/p5w1_bk.json -w '%{http_code}' -X POST "$API/admin/backups" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"artifactPath":"/var/backups/opsedge360/p5w1.tgz","notes":"validation"}')
if [ "$BK" = "201" ] || [ "$BK" = "200" ]; then echo "PASS backup_record ($BK)"; PASS=$((PASS+1)); else echo "FAIL backup_record"; FAIL=$((FAIL+1)); fi

ORG=$(curl -sk -o /dev/null -w '%{http_code}' "$API/admin/organization" -H "Authorization: Bearer $TOKEN")
check admin_organization 200 "$ORG"

CL=$(curl -sk -o /tmp/p5w1_cl.json -w '%{http_code}' "$API/admin/health/cluster" -H "Authorization: Bearer $TOKEN")
check admin_cluster 200 "$CL"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w1_cl.json'))
assert d.get('replicas',{}).get('haValidated') is False
print('PASS cluster_honesty')
PY
PASS=$((PASS+1))

# Cross-tenant isolation: other org admin must not see first tenant's licenses
SIGN2=$(curl -sk -o /tmp/p5w1_signup2.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p5w1.other.${SUFFIX}@opsedge360.internal\",\"password\":\"P5W1Val!${SUFFIX}\",\"name\":\"P5W1b\",\"organizationName\":\"P5W1 Other ${SUFFIX}\"}")
TOKEN2=$(python3 -c "import json;print(json.load(open('/tmp/p5w1_signup2.json')).get('accessToken') or '')")
curl -sk -o /tmp/p5w1_ov_a.json "$API/admin/overview" -H "Authorization: Bearer $TOKEN"
curl -sk -o /tmp/p5w1_lic_a.json "$API/admin/licenses" -H "Authorization: Bearer $TOKEN"
curl -sk -o /tmp/p5w1_ov_b.json "$API/admin/overview" -H "Authorization: Bearer $TOKEN2"
curl -sk -o /tmp/p5w1_lic_b.json "$API/admin/licenses" -H "Authorization: Bearer $TOKEN2"
python3 - <<'PY'
import json
a=json.load(open('/tmp/p5w1_ov_a.json'))
b=json.load(open('/tmp/p5w1_ov_b.json'))
la=json.load(open('/tmp/p5w1_lic_a.json')).get('licenses') or []
lb=json.load(open('/tmp/p5w1_lic_b.json')).get('licenses') or []
assert a['tenant']['id'] != b['tenant']['id'], (a['tenant'], b['tenant'])
assert len(la) >= 1, la
assert len(lb) == 0, lb
print('PASS cross_tenant_admin_isolation')
PY
PASS=$((PASS+1))

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo P5_WAVE1_VALIDATION_OK
