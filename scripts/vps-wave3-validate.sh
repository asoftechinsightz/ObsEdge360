#!/bin/bash
# Wave 3 production validation — audit dual-layer pipeline
set -euo pipefail
API="${API_BASE:-https://api.observability360.asoftechinsightz.com/api/v1}"
PASS=0
FAIL=0
check() {
  local name="$1" expect="$2" got="$3"
  if [ "$got" = "$expect" ]; then
    echo "PASS $name ($got)"
    PASS=$((PASS+1))
  else
    echo "FAIL $name expected=$expect got=$got"
    FAIL=$((FAIL+1))
  fi
}

echo "=== Wave 3 validation @ $API ==="
echo "git: $(cd /opt/OpsEdge360 && git log -1 --oneline)"

H=$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")
check health 200 "$H"
R=$(curl -sk -o /dev/null -w '%{http_code}' "$API/ready")
check ready 200 "$R"

# Migration 017 tables
EV=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='audit_evidence';" | tr -d '[:space:]')
check migration_017_evidence 1 "${EV:-0}"
OB=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='audit_evidence_outbox';" | tr -d '[:space:]')
check migration_017_outbox 1 "${OB:-0}"
RP=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM audit_retention_policies WHERE tenant_id IS NULL;" | tr -d '[:space:]')
if [ "${RP:-0}" -ge 1 ]; then echo "PASS retention_defaults ($RP)"; PASS=$((PASS+1)); else echo "FAIL retention_defaults"; FAIL=$((FAIL+1)); fi

SUFFIX=$(date +%s)
EMAIL="wave3.valid.${SUFFIX}@opsedge360.internal"
PASSWORD="Wave3Val!${SUFFIX}"
ORG="Wave3 Validation ${SUFFIX}"
SIGN=$(curl -sk -o /tmp/w3_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Wave3 Validator\",\"organizationName\":\"$ORG\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then
  echo "PASS signup ($SIGN)"
  PASS=$((PASS+1))
else
  echo "FAIL signup got=$SIGN"; cat /tmp/w3_signup.json; echo; FAIL=$((FAIL+1))
fi
TOKEN=$(python3 -c "import json;d=json.load(open('/tmp/w3_signup.json'));print(d.get('accessToken') or '')" 2>/dev/null || true)
TENANT=$(python3 -c "import json;d=json.load(open('/tmp/w3_signup.json'));print((d.get('user') or {}).get('tenantId') or '')" 2>/dev/null || true)

if [ -z "$TOKEN" ]; then
  echo "FAIL no_token"; FAIL=$((FAIL+1))
  echo "=== RESULT pass=$PASS fail=$FAIL ==="; exit 1
fi

# Cross-tenant still works (Wave 2 regression)
XT=$(curl -sk -o /tmp/w3_xt.json -w '%{http_code}' "$API/cmdb/stats" \
  -H "Authorization: Bearer $TOKEN" -H "X-Tenant-ID: other-tenant-spoof")
check cross_tenant_reject 403 "$XT"

# Wait for outbox drain after deny audit
sleep 3
docker exec opsedge360-api-gateway-1 wget -q -O- http://127.0.0.1:4000/api/v1/audit/health >/dev/null 2>&1 || true
# Force writer tick by calling health (auth required) 
AH=$(curl -sk -o /tmp/w3_audit_health.json -w '%{http_code}' "$API/audit/health" -H "Authorization: Bearer $TOKEN")
check audit_health 200 "$AH"

# Ingest explicit event
ING=$(curl -sk -o /tmp/w3_ingest.json -w '%{http_code}' -X POST "$API/audit/events" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"action\":\"audit.test.ingest\",\"eventCategory\":\"administrative_actions\",\"eventType\":\"wave3_validation\",\"outcome\":\"success\",\"severity\":\"info\"}")
if [ "$ING" = "201" ] || [ "$ING" = "200" ]; then
  echo "PASS audit_ingest ($ING)"
  PASS=$((PASS+1))
else
  echo "FAIL audit_ingest got=$ING"; cat /tmp/w3_ingest.json; echo; FAIL=$((FAIL+1))
fi
EVENT_ID=$(python3 -c "import json;print(json.load(open('/tmp/w3_ingest.json')).get('eventId') or '')" 2>/dev/null || true)
QUEUED=$(python3 -c "import json;print(json.load(open('/tmp/w3_ingest.json')).get('queued'))" 2>/dev/null || true)
echo "INFO eventId=$EVENT_ID queued=$QUEUED"

# Search L1
SR=$(curl -sk -o /tmp/w3_search.json -w '%{http_code}' "$API/audit/events?limit=20" -H "Authorization: Bearer $TOKEN")
check audit_search 200 "$SR"

# Allow writer to process outbox
for i in 1 2 3 4 5 6 7 8 9 10; do
  sleep 2
  CNT=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
    "SELECT COUNT(*) FROM audit_evidence WHERE event_id='$EVENT_ID';" 2>/dev/null | tr -d '[:space:]')
  if [ "${CNT:-0}" -ge 1 ]; then break; fi
done
check evidence_l2_written 1 "${CNT:-0}"

EVID_ID=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT id FROM audit_evidence WHERE event_id='$EVENT_ID' LIMIT 1;" 2>/dev/null | tr -d '[:space:]')
if [ -n "$EVID_ID" ]; then
  VF=$(curl -sk -o /tmp/w3_verify.json -w '%{http_code}' "$API/audit/evidence/${EVID_ID}/verify" \
    -H "Authorization: Bearer $TOKEN")
  check evidence_verify_http 200 "$VF"
  OK=$(python3 -c "import json;print(json.load(open('/tmp/w3_verify.json')).get('ok'))" 2>/dev/null || true)
  if [ "$OK" = "True" ] || [ "$OK" = "true" ]; then
    echo "PASS evidence_integrity"
    PASS=$((PASS+1))
  else
    echo "FAIL evidence_integrity ok=$OK"; cat /tmp/w3_verify.json; echo; FAIL=$((FAIL+1))
  fi
else
  echo "FAIL evidence_id_missing"; FAIL=$((FAIL+1))
fi

EX=$(curl -sk -o /dev/null -w '%{http_code}' "$API/audit/evidence/export?limit=10" -H "Authorization: Bearer $TOKEN")
check evidence_export 200 "$EX"

RT=$(curl -sk -o /dev/null -w '%{http_code}' "$API/audit/retention" -H "Authorization: Bearer $TOKEN")
check retention_list 200 "$RT"

# Queue depth should be finite (writer recovering)
DEPTH=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM audit_evidence_outbox WHERE processed_at IS NULL;" | tr -d '[:space:]')
echo "INFO outbox_pending=$DEPTH"
if [ "${DEPTH:-0}" -ge 0 ]; then echo "PASS outbox_queryable"; PASS=$((PASS+1)); else echo "FAIL outbox_queryable"; FAIL=$((FAIL+1)); fi

# AuthZ enforce still on
AE=$(docker exec opsedge360-api-gateway-1 printenv AUTHZ_ENFORCE 2>/dev/null || echo unset)
if [ "$AE" = "true" ]; then echo "PASS authz_enforce ($AE)"; PASS=$((PASS+1)); else echo "FAIL authz_enforce ($AE)"; FAIL=$((FAIL+1)); fi

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo WAVE3_VALIDATION_OK
