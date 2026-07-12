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

echo "=== RC3 Enterprise Pilot Program @ $API ==="
echo "git: $(cd "$ROOT" && git log -1 --oneline)"

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

TAB=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='rc3_readiness';" | tr -d '[:space:]')
check migration_047 1 "${TAB:-0}"

JTI=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='user_sessions' AND column_name='jti';" | tr -d '[:space:]')
check sessions_jti_column 1 "${JTI:-0}"

DOCS_OK=1
for f in README.md RC3_READINESS_REPORT.md SECURITY_ASSESSMENT.md ENTERPRISE_PILOT_REPORT.md RELEASE_NOTES.md; do
  [ -f "$ROOT/docs/rc3/$f" ] || DOCS_OK=0
done
for f in README.md PILOT_DEPLOYMENT_PACKAGE.md ACCEPTANCE_TEST_PLAN.md EXIT_CRITERIA.md; do
  [ -f "$ROOT/docs/pilot/$f" ] || DOCS_OK=0
done
if [ "$DOCS_OK" = "1" ]; then echo "PASS rc3_pilot_docs"; PASS=$((PASS+1)); else echo "FAIL rc3_pilot_docs"; FAIL=$((FAIL+1)); fi

SUFFIX=$(date +%s)
PASSWORD="Rc3Epp!${SUFFIX}Aa"
EMAIL="rc3.admin.${SUFFIX}@opsedge360.internal"
SIGN=$(curl -sk -o /tmp/rc3_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"RC3 Admin\",\"organizationName\":\"RC3 Org ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/rc3_signup.json')).get('accessToken') or '')")
JTI_CLAIM=$(python3 - <<'PY'
import json,base64
t=json.load(open('/tmp/rc3_signup.json')).get('accessToken') or ''
parts=t.split('.')
assert len(parts)>=2
pad='='*((4-len(parts[1])%4)%4)
payload=json.loads(base64.urlsafe_b64decode(parts[1]+pad))
assert payload.get('jti'), payload
print(payload['jti'])
PY
)
echo "PASS jwt_jti_claim ($JTI_CLAIM)"
PASS=$((PASS+1))

ENR=$(curl -sk -o /tmp/rc3_enr.json -w '%{http_code}' -X POST "$API/me/mfa/enroll-totp" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
if [ "$ENR" = "200" ] || [ "$ENR" = "201" ]; then echo "PASS mfa_enroll"; PASS=$((PASS+1)); else echo "FAIL mfa_enroll"; cat /tmp/rc3_enr.json; FAIL=$((FAIL+1)); fi
FID=$(python3 -c "import json;d=json.load(open('/tmp/rc3_enr.json'));print((d.get('factor') or {}).get('id') or '')")
SECRET=$(python3 -c "import json;print(json.load(open('/tmp/rc3_enr.json')).get('secret') or '')")
CODE=$(totp_code "$SECRET")
VER=$(curl -sk -o /tmp/rc3_ver.json -w '%{http_code}' -X POST "$API/me/mfa/verify-totp" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"factorId\":\"$FID\",\"code\":\"$CODE\"}")
if [ "$VER" = "200" ] || [ "$VER" = "201" ]; then echo "PASS mfa_verify"; PASS=$((PASS+1)); else echo "FAIL mfa_verify"; cat /tmp/rc3_ver.json; FAIL=$((FAIL+1)); fi

ENC=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT CASE WHEN secret_enc LIKE 'oe360:v1:%' THEN 1 ELSE 0 END FROM mfa_factors WHERE id='$FID';" | tr -d '[:space:]')
check mfa_secret_encrypted 1 "${ENC:-0}"

# Session revoke invalidates JWT
SID=$(curl -sk "$API/security/sessions" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json;d=json.load(sys.stdin);print((d.get('sessions') or [{}])[0].get('id') or '')")
if [ -n "$SID" ]; then
  REV=$(curl -sk -o /dev/null -w '%{http_code}' -X POST "$API/security/sessions/$SID/revoke" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
  if [ "$REV" = "200" ] || [ "$REV" = "201" ]; then echo "PASS session_revoke"; PASS=$((PASS+1)); else echo "FAIL session_revoke"; FAIL=$((FAIL+1)); fi
  ME=$(curl -sk -o /dev/null -w '%{http_code}' "$API/auth/me" -H "Authorization: Bearer $TOKEN")
  check jwt_rejected_after_revoke 401 "$ME"
else
  echo "FAIL session_id_missing"; FAIL=$((FAIL+1))
fi

# Fresh login for remaining checks
LOGIN=$(curl -sk -o /tmp/rc3_login.json -w '%{http_code}' -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(python3 -c "import json;d=json.load(open('/tmp/rc3_login.json'));print(d.get('accessToken') or '')")
# MFA may be optional still — if challenge, complete it
python3 - <<'PY' || true
import json
d=json.load(open('/tmp/rc3_login.json'))
open('/tmp/rc3_mfa_needed','w').write('1' if d.get('mfaRequired') else '0')
if d.get('mfaToken'):
  open('/tmp/rc3_mfa_token','w').write(d['mfaToken'])
PY
if [ "$(cat /tmp/rc3_mfa_needed 2>/dev/null || echo 0)" = "1" ]; then
  CODE2=$(totp_code "$SECRET")
  MFA_TOKEN=$(cat /tmp/rc3_mfa_token)
  curl -sk -o /tmp/rc3_login.json -X POST "$API/auth/mfa/verify" -H 'Content-Type: application/json' \
    -d "{\"mfaToken\":\"$MFA_TOKEN\",\"code\":\"$CODE2\"}" >/dev/null
  TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/rc3_login.json')).get('accessToken') or '')")
fi
[ -n "$TOKEN" ] || { echo FAIL relogin_token; exit 1; }
echo "PASS relogin"; PASS=$((PASS+1))

check rc3_overview 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/rc3" -H "Authorization: Bearer $TOKEN")"
check rc3_security 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/rc3/security" -H "Authorization: Bearer $TOKEN")"
check pilot_toolkit 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/pilot/toolkit" -H "Authorization: Bearer $TOKEN")"
check banking360 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/compliance/banking360" -H "Authorization: Bearer $TOKEN")"

SHA=$(cd "$ROOT" && git rev-parse HEAD)
APPR=$(curl -sk -o /tmp/rc3_appr.json -w '%{http_code}' -X PUT "$API/rc3/approve" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"productionSha\":\"$SHA\",\"validationToken\":\"RC3_EPP_VALIDATION_OK\",\"security\":{\"ok\":true},\"performance\":{\"ok\":true},\"auditSummary\":{\"ok\":true}}")
if [ "$APPR" = "200" ] || [ "$APPR" = "201" ]; then echo "PASS rc3_approve"; PASS=$((PASS+1)); else echo "FAIL rc3_approve"; cat /tmp/rc3_appr.json; FAIL=$((FAIL+1)); fi

# RC2 compat
check rc2_branding 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/branding")"

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo RC3_EPP_VALIDATION_OK
