#!/usr/bin/env bash
# Phase 2 validation — env plane, synthetics A, demo framework, ITSM foundation
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

echo "=== Phase 2 validation @ $API ==="
echo "git: $(cd "$ROOT" && git log -1 --oneline)"

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

ENV=$(curl -sk -o /tmp/p2_env.json -w '%{http_code}' "$API/platform/environment")
check platform_environment 200 "$ENV"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p2_env.json'))
assert d.get('appEnv')
assert 'planes' in d and 'demo' in d['planes']
print('PASS env_planes')
PY
PASS=$((PASS+1))

CFG=$(curl -sk -o /tmp/p2_cfg.json -w '%{http_code}' "$API/platform/config")
check platform_config 200 "$CFG"

TAB=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='synthetic_monitors';" | tr -d '[:space:]')
check migration_042 1 "${TAB:-0}"

DOCS_OK=1
for f in ENVIRONMENT_SETUP.md RELEASE_NOTES.md CHANGELOG.md KNOWN_LIMITATIONS.md ROADMAP.md PHASE2_VALIDATION.md; do
  [ -f "$ROOT/docs/releases/$f" ] || [ -f "$ROOT/docs/phase2/$f" ] || DOCS_OK=0
done
[ -f "$ROOT/docs/releases/v1.0.0.md" ] || DOCS_OK=0
[ -f "$ROOT/docker-compose.demo.yml" ] || DOCS_OK=0
[ -f "$ROOT/.env.demo.example" ] || DOCS_OK=0
[ -f "$ROOT/scripts/phase2-demo-seed.sh" ] || DOCS_OK=0
if [ "$DOCS_OK" = "1" ]; then echo "PASS phase2_docs_packaging"; PASS=$((PASS+1)); else echo "FAIL phase2_docs_packaging"; FAIL=$((FAIL+1)); fi

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/p2_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p2.admin.${SUFFIX}@opsedge360.internal\",\"password\":\"P2Val!${SUFFIX}Aa\",\"name\":\"P2 Admin\",\"organizationName\":\"P2 Org ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/p2_signup.json')).get('accessToken') or '')" 2>/dev/null || true)
[ -n "$TOKEN" ] || { echo FAIL token; exit 1; }

FF=$(curl -sk -o /dev/null -w '%{http_code}' "$API/platform/feature-flags" -H "Authorization: Bearer $TOKEN")
check feature_flags 200 "$FF"
IND=$(curl -sk -o /dev/null -w '%{http_code}' "$API/platform/industry-framework" -H "Authorization: Bearer $TOKEN")
check industry_framework 200 "$IND"
ITSM=$(curl -sk -o /dev/null -w '%{http_code}' "$API/platform/itsm/summary" -H "Authorization: Bearer $TOKEN")
check itsm_summary 200 "$ITSM"

MON=$(curl -sk -o /tmp/p2_mon.json -w '%{http_code}' -X POST "$API/synthetics/monitors" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"P2 Health","monitorType":"http","target":"https://api.observability360.asoftechinsightz.com/api/v1/health","assertions":[{"type":"status_code","equals":200}]}')
if [ "$MON" = "200" ] || [ "$MON" = "201" ]; then echo "PASS synthetics_create ($MON)"; PASS=$((PASS+1)); else echo "FAIL synthetics_create"; cat /tmp/p2_mon.json; FAIL=$((FAIL+1)); fi
MID=$(python3 -c "import json;print(json.load(open('/tmp/p2_mon.json')).get('id') or '')" 2>/dev/null || true)
if [ -n "$MID" ]; then
  RUN=$(curl -sk -o /tmp/p2_run.json -w '%{http_code}' -X POST "$API/synthetics/monitors/$MID/run" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
  if [ "$RUN" = "200" ] || [ "$RUN" = "201" ]; then echo "PASS synthetics_run ($RUN)"; PASS=$((PASS+1)); else echo "FAIL synthetics_run"; FAIL=$((FAIL+1)); fi
  python3 - <<'PY'
import json
d=json.load(open('/tmp/p2_run.json'))
st=(d.get('result') or {}).get('status')
assert st in ('ok','fail','error','timeout'), st
print('PASS synthetics_result_status', st)
PY
  PASS=$((PASS+1))
else
  echo "FAIL synthetics_id"; FAIL=$((FAIL+1))
fi

LIST=$(curl -sk -o /dev/null -w '%{http_code}' "$API/synthetics/monitors" -H "Authorization: Bearer $TOKEN")
check synthetics_list 200 "$LIST"

UA=$(curl -sk -o /dev/null -w '%{http_code}' "$API/synthetics/monitors")
if [ "$UA" = "401" ] || [ "$UA" = "403" ]; then echo "PASS synthetics_unauth ($UA)"; PASS=$((PASS+1)); else echo "FAIL synthetics_unauth got=$UA"; FAIL=$((FAIL+1)); fi

# GA regression smoke still green
RC=$(curl -sk -o /dev/null -w '%{http_code}' "$API/admin/system/ga" -H "Authorization: Bearer $TOKEN")
check ga_compat 200 "$RC"

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo P2_ENTERPRISE_MATURITY_VALIDATION_OK
