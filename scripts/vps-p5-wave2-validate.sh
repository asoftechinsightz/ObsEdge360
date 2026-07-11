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

echo "=== Phase 5 Wave 2 validation @ $API ==="
echo "git: $(cd /opt/OpsEdge360 && git log -1 --oneline)"

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

TAB=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='ha_cluster_nodes';" | tr -d '[:space:]')
check migration_034_nodes 1 "${TAB:-0}"

COMP=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='ha_component_status';" | tr -d '[:space:]')
check migration_034_components 1 "${COMP:-0}"

# Artifact checks on VPS checkout
ROOT=/opt/OpsEdge360
for f in docker-compose.ha.yml infra/redis/sentinel.conf infra/helm/opsedge360/values-ha.yaml \
  infra/helm/opsedge360/templates/hpa-gateway.yaml infra/helm/opsedge360/templates/pdb-gateway.yaml; do
  if [ -f "$ROOT/$f" ]; then echo "PASS artifact_$f"; PASS=$((PASS+1)); else echo "FAIL artifact_$f"; FAIL=$((FAIL+1)); fi
done

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/p5w2_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p5w2.admin.${SUFFIX}@opsedge360.internal\",\"password\":\"P5W2Val!${SUFFIX}\",\"name\":\"P5W2 Admin\",\"organizationName\":\"P5W2 Org ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/p5w2_signup.json')).get('accessToken') or '')")

HA=$(curl -sk -o /tmp/p5w2_ha.json -w '%{http_code}' "$API/admin/ha" -H "Authorization: Bearer $TOKEN")
check admin_ha 200 "$HA"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w2_ha.json'))
assert d.get('gaClaim') is False
assert d.get('foundationReady') is True
assert d.get('haValidated') is True
assert d.get('topologyMode') in ('single_node_ha_ready','multi_node')
assert d.get('wave')=='v1.0.0-wave2'
print('PASS ha_overview_shape')
PY
PASS=$((PASS+1))

CL=$(curl -sk -o /tmp/p5w2_cl.json -w '%{http_code}' "$API/admin/cluster" -H "Authorization: Bearer $TOKEN")
check admin_cluster 200 "$CL"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w2_cl.json'))
assert 'services' in d
assert d['services'].get('database') is not None
print('PASS cluster_services')
PY
PASS=$((PASS+1))

REP=$(curl -sk -o /tmp/p5w2_rep.json -w '%{http_code}' "$API/admin/replication" -H "Authorization: Bearer $TOKEN")
check admin_replication 200 "$REP"

FO=$(curl -sk -o /tmp/p5w2_fo.json -w '%{http_code}' -X POST "$API/admin/failover" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"component":"postgresql","eventType":"drill","fromNode":"primary","toNode":"standby","notes":"wave2 validation"}')
if [ "$FO" = "201" ] || [ "$FO" = "200" ]; then echo "PASS failover_record ($FO)"; PASS=$((PASS+1)); else echo "FAIL failover_record"; cat /tmp/p5w2_fo.json; FAIL=$((FAIL+1)); fi

BV=$(curl -sk -o /tmp/p5w2_bv.json -w '%{http_code}' -X POST "$API/admin/backups/verify" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"artifactPath":"/var/backups/opsedge360/wave2-validate.sql.gz","integrityOk":true,"restoreVerified":false}')
if [ "$BV" = "201" ] || [ "$BV" = "200" ]; then echo "PASS backup_verify ($BV)"; PASS=$((PASS+1)); else echo "FAIL backup_verify"; cat /tmp/p5w2_bv.json; FAIL=$((FAIL+1)); fi

UP=$(curl -sk -o /tmp/p5w2_up.json -w '%{http_code}' -X POST "$API/admin/upgrades/precheck" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"fromVersion":"v1.0.0-wave1","toVersion":"v1.0.0-wave2"}')
if [ "$UP" = "201" ] || [ "$UP" = "200" ]; then echo "PASS upgrade_precheck ($UP)"; PASS=$((PASS+1)); else echo "FAIL upgrade_precheck"; cat /tmp/p5w2_up.json; FAIL=$((FAIL+1)); fi
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w2_up.json'))
assert d.get('passed') is True
print('PASS upgrade_precheck_passed')
PY
PASS=$((PASS+1))

# Security: unauthenticated denied
UA=$(curl -sk -o /dev/null -w '%{http_code}' "$API/admin/ha")
if [ "$UA" = "401" ] || [ "$UA" = "403" ]; then echo "PASS ha_unauth ($UA)"; PASS=$((PASS+1)); else echo "FAIL ha_unauth got=$UA"; FAIL=$((FAIL+1)); fi

# Postgres replication probe honesty (single node OK)
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w2_ha.json'))
comps=d.get('components') or []
pg=next((c for c in comps if c.get('component')=='postgresql'), None)
assert pg is not None
assert pg.get('status') in ('up','down')
print('PASS postgres_component_present')
PY
PASS=$((PASS+1))

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo P5_WAVE2_VALIDATION_OK
