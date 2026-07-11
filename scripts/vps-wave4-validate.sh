#!/bin/bash
# Wave 4 production validation — secrets management
set -euo pipefail
API="${API_BASE:-https://api.observability360.asoftechinsightz.com/api/v1}"
PASS=0
FAIL=0
check() {
  local name="$1" expect="$2" got="$3"
  if [ "$got" = "$expect" ]; then echo "PASS $name ($got)"; PASS=$((PASS+1));
  else echo "FAIL $name expected=$expect got=$got"; FAIL=$((FAIL+1)); fi
}

echo "=== Wave 4 validation @ $API ==="
echo "git: $(cd /opt/OpsEdge360 && git log -1 --oneline)"

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

ST=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='secrets';" | tr -d '[:space:]')
check migration_018_secrets 1 "${ST:-0}"

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/w4_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"wave4.valid.${SUFFIX}@opsedge360.internal\",\"password\":\"Wave4Val!${SUFFIX}\",\"name\":\"W4\",\"organizationName\":\"Wave4 Val ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/w4_signup.json')).get('accessToken') or '')")

SH=$(curl -sk -o /tmp/w4_sec_health.json -w '%{http_code}' "$API/secrets/health" -H "Authorization: Bearer $TOKEN")
check secrets_health 200 "$SH"

CR=$(curl -sk -o /tmp/w4_create.json -w '%{http_code}' -X POST "$API/secrets" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"name\":\"demo-key-${SUFFIX}\",\"value\":\"plain-secret-${SUFFIX}\",\"description\":\"wave4\"}")
if [ "$CR" = "201" ] || [ "$CR" = "200" ]; then echo "PASS secrets_create ($CR)"; PASS=$((PASS+1)); else echo "FAIL secrets_create $CR"; cat /tmp/w4_create.json; FAIL=$((FAIL+1)); fi
SID=$(python3 -c "import json;print(json.load(open('/tmp/w4_create.json')).get('id') or '')")

RV=$(curl -sk -o /tmp/w4_reveal.json -w '%{http_code}' "$API/secrets/${SID}/value" -H "Authorization: Bearer $TOKEN")
check secrets_reveal 200 "$RV"
VAL=$(python3 -c "import json;print(json.load(open('/tmp/w4_reveal.json')).get('value') or '')")
if [ "$VAL" = "plain-secret-${SUFFIX}" ]; then echo "PASS secrets_value_match"; PASS=$((PASS+1)); else echo "FAIL secrets_value_match"; FAIL=$((FAIL+1)); fi

# Ciphertext only in DB
CT=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM secret_versions sv JOIN secrets s ON s.id=sv.secret_id WHERE s.id='$SID' AND sv.ciphertext NOT LIKE '%plain-secret%';" | tr -d '[:space:]')
check ciphertext_not_plaintext 1 "${CT:-0}"

RT=$(curl -sk -o /tmp/w4_rot.json -w '%{http_code}' -X POST "$API/secrets/${SID}/rotate" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"value\":\"rotated-${SUFFIX}\"}")
if [ "$RT" = "201" ] || [ "$RT" = "200" ]; then echo "PASS secrets_rotate ($RT)"; PASS=$((PASS+1)); else echo "FAIL secrets_rotate"; FAIL=$((FAIL+1)); fi

VR=$(curl -sk -o /dev/null -w '%{http_code}' "$API/secrets/${SID}/versions" -H "Authorization: Bearer $TOKEN")
check secrets_versions 200 "$VR"

# Cross-tenant: second user cannot read first secret
SIGN2=$(curl -sk -o /tmp/w4_signup2.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"wave4.other.${SUFFIX}@opsedge360.internal\",\"password\":\"Wave4Val!${SUFFIX}\",\"name\":\"W4b\",\"organizationName\":\"Wave4 Other ${SUFFIX}\"}")
TOKEN2=$(python3 -c "import json;print(json.load(open('/tmp/w4_signup2.json')).get('accessToken') or '')")
XT=$(curl -sk -o /dev/null -w '%{http_code}' "$API/secrets/${SID}/value" -H "Authorization: Bearer $TOKEN2")
if [ "$XT" = "404" ] || [ "$XT" = "403" ]; then echo "PASS cross_tenant_secret ($XT)"; PASS=$((PASS+1)); else echo "FAIL cross_tenant_secret got=$XT"; FAIL=$((FAIL+1)); fi

DS=$(curl -sk -o /dev/null -w '%{http_code}' -X POST "$API/secrets/${SID}/disable" -H "Authorization: Bearer $TOKEN")
if [ "$DS" = "201" ] || [ "$DS" = "200" ]; then echo "PASS secrets_disable ($DS)"; PASS=$((PASS+1)); else echo "FAIL secrets_disable"; FAIL=$((FAIL+1)); fi

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo WAVE4_VALIDATION_OK
