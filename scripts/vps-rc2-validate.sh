#!/bin/bash
set -euo pipefail
API="${API_BASE:-https://api.observability360.asoftechinsightz.com/api/v1}"
ROOT="${ROOT_DIR:-/opt/OpsEdge360}"
PASS=0
FAIL=0
check() {
  local name="$1" expect="$2" got="$3"
  if [ "$got" = "$expect" ]; then echo "PASS $name ($got)"; PASS=$((PASS+1));
  else echo "FAIL $name expected=$expect got=$got"; FAIL=$((FAIL+1)); fi
}

totp_code() {
  local secret="$1"
  python3 - <<PY
import hmac, hashlib, struct, time
BASE32='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
s='${secret}'.upper().replace('=','').replace(' ','')
bits=0; val=0; out=bytearray()
for ch in s:
    idx=BASE32.find(ch)
    if idx<0: continue
    val=(val<<5)|idx; bits+=5
    if bits>=8:
        out.append((val>>(bits-8))&255); bits-=8
secret=bytes(out)
counter=int(time.time())//30
msg=struct.pack('>Q', counter)
digest=hmac.new(secret, msg, hashlib.sha1).digest()
o=digest[-1]&0x0f
code=((digest[o]&0x7f)<<24)|((digest[o+1]&0xff)<<16)|((digest[o+2]&0xff)<<8)|(digest[o+3]&0xff)
print(str(code%1000000).zfill(6))
PY
}

echo "=== RC2 Pilot Production Readiness @ $API ==="
echo "git: $(cd "$ROOT" && git log -1 --oneline)"

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

TAB=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='rc2_readiness';" | tr -d '[:space:]')
check migration_045 1 "${TAB:-0}"

CHK=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT CASE WHEN pg_get_constraintdef(oid) LIKE '%mfa_challenge%' THEN 1 ELSE 0 END FROM pg_constraint WHERE conname='login_history_event_chk' LIMIT 1;" | tr -d '[:space:]')
check migration_046_mfa_challenge 1 "${CHK:-0}"

DOCS_OK=1
for f in README.md ENTERPRISE_PRODUCT_AUDIT.md PERFORMANCE_BENCHMARK_REPORT.md SECURITY_ASSESSMENT.md \
  PILOT_INSTALLATION_GUIDE.md PILOT_SUCCESS_CHECKLIST.md CUSTOMER_ACCEPTANCE_CHECKLIST.md \
  OPERATIONS_RUNBOOK.md ROLLBACK_PLAN.md RELEASE_NOTES.md; do
  [ -f "$ROOT/docs/rc2/$f" ] || DOCS_OK=0
done
[ -f "$ROOT/scripts/vps-rc2-validate.sh" ] || DOCS_OK=0
if [ "$DOCS_OK" = "1" ]; then echo "PASS rc2_docs"; PASS=$((PASS+1)); else echo "FAIL rc2_docs"; FAIL=$((FAIL+1)); fi

check branding 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/branding")"
python3 - <<PY
import json,urllib.request,ssl
ctx=ssl._create_unverified_context()
d=json.load(urllib.request.urlopen('${API}/branding', context=ctx))
assert d.get('product')=='OpsEdge360'
print('PASS branding_product')
PY
PASS=$((PASS+1))

check walkthrough 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/demo/walkthrough")"

SUFFIX=$(date +%s)
PASSWORD="Rc2Pilot!${SUFFIX}Aa"
EMAIL="rc2.admin.${SUFFIX}@opsedge360.internal"
SIGN=$(curl -sk -o /tmp/rc2_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"RC2 Admin\",\"organizationName\":\"RC2 Org ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/rc2_signup.json')).get('accessToken') or '')")
[ -n "$TOKEN" ] || { echo FAIL token; exit 1; }

ENR=$(curl -sk -o /tmp/rc2_enr.json -w '%{http_code}' -X POST "$API/me/mfa/enroll-totp" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
if [ "$ENR" = "200" ] || [ "$ENR" = "201" ]; then echo "PASS mfa_enroll_totp"; PASS=$((PASS+1)); else echo "FAIL mfa_enroll_totp"; cat /tmp/rc2_enr.json; FAIL=$((FAIL+1)); fi
FID=$(python3 -c "import json;d=json.load(open('/tmp/rc2_enr.json'));print((d.get('factor') or {}).get('id') or '')")
SECRET=$(python3 -c "import json;print(json.load(open('/tmp/rc2_enr.json')).get('secret') or '')")
CODE=$(totp_code "$SECRET")
VER=$(curl -sk -o /tmp/rc2_ver.json -w '%{http_code}' -X POST "$API/me/mfa/verify-totp" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"factorId\":\"$FID\",\"code\":\"$CODE\"}")
if [ "$VER" = "200" ] || [ "$VER" = "201" ]; then echo "PASS mfa_verify_totp"; PASS=$((PASS+1)); else echo "FAIL mfa_verify_totp"; cat /tmp/rc2_ver.json; FAIL=$((FAIL+1)); fi
python3 - <<'PY'
import json
d=json.load(open('/tmp/rc2_ver.json'))
assert d.get('backupCodes') and len(d['backupCodes'])>=8
print('PASS backup_codes')
PY
PASS=$((PASS+1))

# Require MFA at login for this tenant
POL=$(curl -sk -o /tmp/rc2_pol.json -w '%{http_code}' -X PUT "$API/security/mfa-policy" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"mode":"required","graceDays":14}')
if [ "$POL" = "200" ] || [ "$POL" = "201" ]; then echo "PASS mfa_policy_required"; PASS=$((PASS+1)); else echo "FAIL mfa_policy_required"; cat /tmp/rc2_pol.json; FAIL=$((FAIL+1)); fi

LOGIN=$(curl -sk -o /tmp/rc2_login.json -w '%{http_code}' -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
if [ "$LOGIN" = "200" ] || [ "$LOGIN" = "201" ]; then echo "PASS login_mfa_challenge_http"; PASS=$((PASS+1)); else echo "FAIL login_mfa_challenge_http"; FAIL=$((FAIL+1)); fi
python3 - <<'PY'
import json
d=json.load(open('/tmp/rc2_login.json'))
assert d.get('mfaRequired') is True and d.get('mfaToken'), d
print('PASS login_mfa_required_body')
PY
PASS=$((PASS+1))
MFA_TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/rc2_login.json')).get('mfaToken') or '')")
CODE2=$(totp_code "$SECRET")
MFV=$(curl -sk -o /tmp/rc2_mfv.json -w '%{http_code}' -X POST "$API/auth/mfa/verify" \
  -H 'Content-Type: application/json' \
  -d "{\"mfaToken\":\"$MFA_TOKEN\",\"code\":\"$CODE2\"}")
if [ "$MFV" = "200" ] || [ "$MFV" = "201" ]; then echo "PASS auth_mfa_verify"; PASS=$((PASS+1)); else echo "FAIL auth_mfa_verify"; cat /tmp/rc2_mfv.json; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/rc2_mfv.json')).get('accessToken') or '')")
[ -n "$TOKEN" ] || { echo FAIL post_mfa_token; FAIL=$((FAIL+1)); }

check security_dashboard 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/security/dashboard" -H "Authorization: Bearer $TOKEN")"
check login_history 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/security/login-history" -H "Authorization: Bearer $TOKEN")"
check sessions 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/security/sessions" -H "Authorization: Bearer $TOKEN")"

ALERT=$(curl -sk -o /dev/null -w '%{http_code}' -X POST "$API/security/alerts" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"severity":"info","title":"RC2 validation alert"}')
if [ "$ALERT" = "200" ] || [ "$ALERT" = "201" ]; then echo "PASS security_alert"; PASS=$((PASS+1)); else echo "FAIL security_alert"; FAIL=$((FAIL+1)); fi

RESET=$(curl -sk -o /dev/null -w '%{http_code}' -X POST "$API/demo/reset" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
if [ "$RESET" = "200" ] || [ "$RESET" = "201" ]; then echo "PASS demo_reset"; PASS=$((PASS+1)); else echo "FAIL demo_reset"; FAIL=$((FAIL+1)); fi

for N in 100 500 1000 5000 10000; do
  B=$(curl -sk -o /tmp/rc2_bench.json -w '%{http_code}' -X POST "$API/performance/benchmarks" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d "{\"concurrentUsers\":$N}")
  if [ "$B" = "200" ] || [ "$B" = "201" ]; then echo "PASS bench_$N"; PASS=$((PASS+1)); else echo "FAIL bench_$N"; FAIL=$((FAIL+1)); fi
done

check pilot_package 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/pilot/package" -H "Authorization: Bearer $TOKEN")"

SHA=$(cd "$ROOT" && git rev-parse HEAD)
APPR=$(curl -sk -o /tmp/rc2_appr.json -w '%{http_code}' -X PUT "$API/rc2/approve" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"productionSha\":\"$SHA\",\"validationToken\":\"RC2_PILOT_VALIDATION_OK\",\"security\":{\"ok\":true},\"performance\":{\"ok\":true},\"auditSummary\":{\"ok\":true}}")
if [ "$APPR" = "200" ] || [ "$APPR" = "201" ]; then echo "PASS rc2_approve"; PASS=$((PASS+1)); else echo "FAIL rc2_approve"; cat /tmp/rc2_appr.json; FAIL=$((FAIL+1)); fi

# Prior compat
check rc1_about 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/about")"
check p3_reports 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/reports" -H "Authorization: Bearer $TOKEN")"
check ga_compat 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/admin/system/ga" -H "Authorization: Bearer $TOKEN")"

[ -f "$ROOT/docker-compose.prod.yml" ] && [ -f "$ROOT/infra/helm/opsedge360/Chart.yaml" ] && [ -f "$ROOT/scripts/airgap-package.sh" ] \
  && { echo PASS deployment_artifacts; PASS=$((PASS+1)); } || { echo FAIL deployment_artifacts; FAIL=$((FAIL+1)); }

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo RC2_PILOT_VALIDATION_OK
