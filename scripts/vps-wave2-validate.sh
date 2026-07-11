#!/bin/bash
# Wave 2 production validation — run on VPS after deploy
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

echo "=== Wave 2 validation @ $API ==="
echo "git: $(cd /opt/OpsEdge360 && git log -1 --oneline)"

H=$(curl -sk -o /tmp/w2_health.json -w '%{http_code}' "$API/health")
check health 200 "$H"
R=$(curl -sk -o /dev/null -w '%{http_code}' "$API/ready")
check ready 200 "$R"
L=$(curl -sk -o /dev/null -w '%{http_code}' "$API/live")
check live 200 "$L"
M=$(curl -sk -o /dev/null -w '%{http_code}' "$API/metrics")
check metrics 200 "$M"

TOP=$(curl -sk -o /dev/null -w '%{http_code}' "$API/cmdb/topology/application")
check topology_noauth 401 "$TOP"
REF0=$(curl -sk -o /dev/null -w '%{http_code}' -X POST "$API/auth/refresh")
check refresh_noauth 401 "$REF0"

EMAIL="${OE360_VALID_EMAIL:-}"
PASSWORD="${OE360_VALID_PASSWORD:-}"
TENANT="${OE360_VALID_TENANT:-}"

if [ -f /root/opsedge360-wave2-valid.env ]; then
  # shellcheck disable=SC1091
  source /root/opsedge360-wave2-valid.env
  EMAIL="${OE360_VALID_EMAIL:-$EMAIL}"
  PASSWORD="${OE360_VALID_PASSWORD:-$PASSWORD}"
  TENANT="${OE360_VALID_TENANT:-$TENANT}"
fi

TOKEN=""
if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
  # Ephemeral signup for validation (admin role) — unique org avoids conflicts
  SUFFIX=$(date +%s)
  EMAIL="wave2.valid.${SUFFIX}@opsedge360.internal"
  PASSWORD="Wave2Val!${SUFFIX}"
  ORG="Wave2 Validation ${SUFFIX}"
  echo "INFO creating ephemeral validation user via signup"
  SIGN=$(curl -sk -o /tmp/w2_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Wave2 Validator\",\"organizationName\":\"$ORG\"}")
  if [ "$SIGN" != "201" ] && [ "$SIGN" != "200" ]; then
    echo "FAIL signup got=$SIGN"
    cat /tmp/w2_signup.json; echo
    FAIL=$((FAIL+1))
  else
    echo "PASS signup ($SIGN)"
    PASS=$((PASS+1))
    TOKEN=$(python3 -c "import json;d=json.load(open('/tmp/w2_signup.json'));print(d.get('accessToken') or '')")
    TENANT=$(python3 -c "import json;d=json.load(open('/tmp/w2_signup.json'));print((d.get('user') or {}).get('tenantId') or '')")
  fi
else
  LOGIN=$(curl -sk -o /tmp/w2_login.json -w '%{http_code}' -X POST "$API/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"tenantId\":\"${TENANT:-default}\"}")
  if [ "$LOGIN" = "201" ] || [ "$LOGIN" = "200" ]; then
    echo "PASS login ($LOGIN)"
    PASS=$((PASS+1))
    TOKEN=$(python3 -c "import json;d=json.load(open('/tmp/w2_login.json'));print(d.get('accessToken') or '')")
    TENANT=$(python3 -c "import json;d=json.load(open('/tmp/w2_login.json'));print((d.get('user') or {}).get('tenantId') or '${TENANT:-default}')")
  else
    echo "FAIL login got=$LOGIN"
    cat /tmp/w2_login.json; echo
    FAIL=$((FAIL+1))
  fi
fi

if [ -n "$TOKEN" ]; then
  ME=$(curl -sk -o /tmp/w2_me.json -w '%{http_code}' "$API/auth/me" -H "Authorization: Bearer $TOKEN")
  check auth_me 200 "$ME"

  REF=$(curl -sk -o /tmp/w2_refresh.json -w '%{http_code}' -X POST "$API/auth/refresh" \
    -H "Authorization: Bearer $TOKEN")
  check refresh 200 "$REF"
  TOKEN2=$(python3 -c "import json;d=json.load(open('/tmp/w2_refresh.json'));print(d.get('accessToken') or '')" 2>/dev/null || true)
  if [ -n "$TOKEN2" ]; then TOKEN="$TOKEN2"; echo "PASS refresh_token"; PASS=$((PASS+1)); else echo "FAIL refresh_token"; FAIL=$((FAIL+1)); fi

  TOPA=$(curl -sk -o /dev/null -w '%{http_code}' "$API/cmdb/topology/application" -H "Authorization: Bearer $TOKEN")
  if [ "$TOPA" = "200" ] || [ "$TOPA" = "502" ] || [ "$TOPA" = "503" ]; then
    echo "PASS rbac_topology_authz ($TOPA)"
    PASS=$((PASS+1))
  else
    echo "FAIL rbac_topology_authz got=$TOPA"
    FAIL=$((FAIL+1))
  fi

  XT=$(curl -sk -o /tmp/w2_xt.json -w '%{http_code}' "$API/cmdb/topology/application" \
    -H "Authorization: Bearer $TOKEN" -H "X-Tenant-ID: other-tenant-spoof")
  check cross_tenant_reject 403 "$XT"
  CODE=$(python3 -c "import json;print(json.load(open('/tmp/w2_xt.json')).get('code',''))" 2>/dev/null || true)
  if [ "$CODE" = "TENANT_MISMATCH" ]; then echo "PASS cross_tenant_code"; PASS=$((PASS+1)); else echo "FAIL cross_tenant_code got=$CODE"; FAIL=$((FAIL+1)); fi

  if [ -n "$TENANT" ]; then
    OKH=$(curl -sk -o /dev/null -w '%{http_code}' "$API/cmdb/topology/application" \
      -H "Authorization: Bearer $TOKEN" -H "X-Tenant-ID: $TENANT")
    if [ "$OKH" = "200" ] || [ "$OKH" = "502" ] || [ "$OKH" = "503" ]; then
      echo "PASS matching_tenant_header ($OKH)"
      PASS=$((PASS+1))
    else
      echo "FAIL matching_tenant_header got=$OKH"
      FAIL=$((FAIL+1))
    fi
  fi
else
  echo "FAIL no_token_for_auth_checks"
  FAIL=$((FAIL+1))
fi

MIG=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='authz_policy_versions';" 2>/dev/null | tr -d '[:space:]')
check migration_016 1 "${MIG:-0}"

AUD=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM audit_logs WHERE action='authz.deny' AND created_at > NOW() - INTERVAL '1 hour';" 2>/dev/null | tr -d '[:space:]')
echo "INFO authz.deny_last_hour=${AUD:-0}"
if [ "${AUD:-0}" -ge 1 ] 2>/dev/null; then
  echo "PASS audit_events"
  PASS=$((PASS+1))
else
  echo "FAIL audit_events count=${AUD:-0}"
  FAIL=$((FAIL+1))
fi

# Auth metrics: process-local until Wave 5 Prometheus export — confirm AuthZ flag + deny audit as proxy
AE=$(docker exec opsedge360-api-gateway-1 printenv AUTHZ_ENFORCE 2>/dev/null || echo unset)
echo "INFO AUTHZ_ENFORCE=$AE"
if [ "$AE" = "true" ] || [ "$AE" = "1" ] || [ "$AE" = "unset" ]; then
  # unset defaults to enforce-on in code; true is explicit
  echo "PASS authz_enforce_posture ($AE)"
  PASS=$((PASS+1))
else
  echo "FAIL authz_enforce_posture ($AE)"
  FAIL=$((FAIL+1))
fi

WEB=$(curl -sk -o /dev/null -w '%{http_code}' https://observability360.asoftechinsightz.com/)
check web 200 "$WEB"

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo WAVE2_VALIDATION_OK
