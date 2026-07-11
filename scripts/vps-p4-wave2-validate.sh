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

echo "=== Phase 4 Wave 2 validation @ $API ==="
echo "git: $(cd /opt/OpsEdge360 && git log -1 --oneline)"

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

TAB=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='aiops_correlation_members';" | tr -d '[:space:]')
check migration_029_members 1 "${TAB:-0}"

SNAP=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='aiops_signal_snapshots';" | tr -d '[:space:]')
check migration_029_snapshots 1 "${SNAP:-0}"

COL=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='aiops_correlation_events' AND column_name='score';" | tr -d '[:space:]')
check migration_029_score_col 1 "${COL:-0}"

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/p4w2_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p4w2.valid.${SUFFIX}@opsedge360.internal\",\"password\":\"P4W2Val!${SUFFIX}\",\"name\":\"P4W2\",\"organizationName\":\"P4W2 Val ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/p4w2_signup.json')).get('accessToken') or '')")
TENANT_SLUG=$(python3 -c "import json;print(json.load(open('/tmp/p4w2_signup.json')).get('user',{}).get('tenantId') or '')")

TID=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT id FROM tenants WHERE slug='${TENANT_SLUG}' LIMIT 1;" | tr -d '[:space:]')
if [ -n "$TID" ]; then
  docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c \
    "INSERT INTO alert_events (tenant_id, title, severity, status, labels)
     VALUES ('$TID', 'W2 API latency ${SUFFIX}', 'high', 'firing', '{\"service\":\"payments-api\",\"job\":\"payments-api\"}'::jsonb);" >/dev/null
  docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c \
    "INSERT INTO anomalies (tenant_id, anomaly_type, metric_name, baseline_value, observed_value, deviation_sigma, severity, status, source)
     VALUES ('$TID', 'metric_deviation', 'payments_api_latency_p99', 80, 420, 4.1, 'high', 'open', 'ops_scan');" >/dev/null
  docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c \
    "INSERT INTO otlp_logs (tenant_id, body, severity, service_name)
     VALUES
       ('$TID', 'connection pool exhausted ${SUFFIX}', 'ERROR', 'payments-api'),
       ('$TID', 'timeout waiting for db ${SUFFIX}', 'ERROR', 'payments-api'),
       ('$TID', 'retry storm ${SUFFIX}', 'WARN', 'payments-api');" >/dev/null
  docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c \
    "INSERT INTO otlp_spans (tenant_id, trace_id, span_id, name, service_name, duration_ms, status_code)
     VALUES
       ('$TID', 't${SUFFIX}a', 's1', 'POST /charge', 'payments-api', 2500, 'ERROR'),
       ('$TID', 't${SUFFIX}b', 's2', 'POST /charge', 'payments-api', 3100, 'ERROR');" >/dev/null
  echo "PASS seed_multisignal"; PASS=$((PASS+1))
else
  echo "FAIL seed_multisignal (tenant not found)"; FAIL=$((FAIL+1))
fi

COLLECT=$(curl -sk -o /tmp/p4w2_collect.json -w '%{http_code}' -X POST "$API/ai/signals/collect" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"windowMinutes":60}')
if [ "$COLLECT" = "201" ] || [ "$COLLECT" = "200" ]; then echo "PASS signals_collect ($COLLECT)"; PASS=$((PASS+1)); else echo "FAIL signals_collect"; cat /tmp/p4w2_collect.json; FAIL=$((FAIL+1)); fi
python3 - <<'PY'
import json
d=json.load(open('/tmp/p4w2_collect.json'))
assert d.get('signalCount', 0) >= 2, d
assert 'counts' in d
print('PASS signals_collect_shape')
PY
PASS=$((PASS+1))

SS=$(curl -sk -o /tmp/p4w2_snap.json -w '%{http_code}' "$API/ai/signals/snapshot" -H "Authorization: Bearer $TOKEN")
check signals_snapshot 200 "$SS"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p4w2_snap.json'))
assert d.get('snapshot') is not None
print('PASS snapshot_present')
PY
PASS=$((PASS+1))

CORR=$(curl -sk -o /tmp/p4w2_corr.json -w '%{http_code}' -X POST "$API/ai/correlate" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"windowMinutes":60,"minSignals":2}')
if [ "$CORR" = "201" ] || [ "$CORR" = "200" ]; then echo "PASS aiops_correlate ($CORR)"; PASS=$((PASS+1)); else echo "FAIL aiops_correlate"; cat /tmp/p4w2_corr.json; FAIL=$((FAIL+1)); fi
python3 - <<'PY'
import json
d=json.load(open('/tmp/p4w2_corr.json'))
assert 'signalCounts' in d or 'signals' in d
assert 'clusters' in d
assert len(d.get('clusters') or []) >= 1, d
print('PASS correlate_clusters')
PY
PASS=$((PASS+1))

CID=$(python3 -c "import json;d=json.load(open('/tmp/p4w2_corr.json'));print((d.get('clusters') or [{}])[0].get('id') or d.get('id') or '')")

CL=$(curl -sk -o /tmp/p4w2_list.json -w '%{http_code}' "$API/ai/correlations" -H "Authorization: Bearer $TOKEN")
check correlations_list 200 "$CL"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p4w2_list.json'))
assert isinstance(d.get('events'), list)
print('PASS correlations_list_shape')
PY
PASS=$((PASS+1))

DET=$(curl -sk -o /tmp/p4w2_det.json -w '%{http_code}' "$API/ai/correlations/${CID}" -H "Authorization: Bearer $TOKEN")
check correlation_detail 200 "$DET"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p4w2_det.json'))
assert d.get('id')
assert isinstance(d.get('members'), list)
assert len(d.get('members') or []) >= 1
types=set()
for m in d['members']:
    types.add(m.get('signal_type') or m.get('signalType'))
assert len(types) >= 2, types
print('PASS correlation_members_multisignal')
PY
PASS=$((PASS+1))

# Cross-tenant isolation
SIGN2=$(curl -sk -o /tmp/p4w2_signup2.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p4w2.other.${SUFFIX}@opsedge360.internal\",\"password\":\"P4W2Val!${SUFFIX}\",\"name\":\"P4W2b\",\"organizationName\":\"P4W2 Other ${SUFFIX}\"}")
TOKEN2=$(python3 -c "import json;print(json.load(open('/tmp/p4w2_signup2.json')).get('accessToken') or '')")
XT=$(curl -sk -o /dev/null -w '%{http_code}' "$API/ai/correlations/${CID}" -H "Authorization: Bearer $TOKEN2")
if [ "$XT" = "404" ] || [ "$XT" = "403" ] || [ "$XT" = "400" ]; then echo "PASS cross_tenant_correlation ($XT)"; PASS=$((PASS+1)); else echo "FAIL cross_tenant_correlation got=$XT"; FAIL=$((FAIL+1)); fi

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo P4_WAVE2_VALIDATION_OK
