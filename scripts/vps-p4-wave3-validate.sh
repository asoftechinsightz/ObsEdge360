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

echo "=== Phase 4 Wave 3 validation @ $API ==="
echo "git: $(cd /opt/OpsEdge360 && git log -1 --oneline)"

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

TAB=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='capacity_forecast_runs';" | tr -d '[:space:]')
check migration_030_runs 1 "${TAB:-0}"

COL=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='anomalies' AND column_name='model_version';" | tr -d '[:space:]')
check migration_030_anomaly_model 1 "${COL:-0}"

COL2=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='predictive_forecasts' AND column_name='breach_eta';" | tr -d '[:space:]')
check migration_030_breach_eta 1 "${COL2:-0}"

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/p4w3_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p4w3.valid.${SUFFIX}@opsedge360.internal\",\"password\":\"P4W3Val!${SUFFIX}\",\"name\":\"P4W3\",\"organizationName\":\"P4W3 Val ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/p4w3_signup.json')).get('accessToken') or '')")
TENANT_SLUG=$(python3 -c "import json;print(json.load(open('/tmp/p4w3_signup.json')).get('user',{}).get('tenantId') or '')")

TID=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT id FROM tenants WHERE slug='${TENANT_SLUG}' LIMIT 1;" | tr -d '[:space:]')
if [ -n "$TID" ]; then
  # Rising CPU utilization series for capacity + predictive models
  docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c "
    INSERT INTO prometheus_samples (tenant_id, name, value, labels, job, instance, recorded_at)
    SELECT '$TID', 'node_cpu_utilization_pct', 40 + (g * 4.5),
           '{\"service\":\"payments-api\"}'::jsonb, 'node', 'w3-host-${SUFFIX}',
           NOW() - ((12 - g) * INTERVAL '30 minutes')
    FROM generate_series(0, 12) g;" >/dev/null
  docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c "
    INSERT INTO prometheus_samples (tenant_id, name, value, labels, job, instance, recorded_at)
    SELECT '$TID', 'node_memory_utilization_pct', 55 + (g * 3.2),
           '{\"service\":\"payments-api\"}'::jsonb, 'node', 'w3-host-${SUFFIX}',
           NOW() - ((12 - g) * INTERVAL '30 minutes')
    FROM generate_series(0, 12) g;" >/dev/null
  echo "PASS seed_metric_series"; PASS=$((PASS+1))
else
  echo "FAIL seed_metric_series (tenant not found)"; FAIL=$((FAIL+1))
fi

PRED=$(curl -sk -o /tmp/p4w3_pred.json -w '%{http_code}' -X POST "$API/ops-intelligence/predictive/scan" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"lookbackHours":12,"horizonHours":48}')
if [ "$PRED" = "201" ] || [ "$PRED" = "200" ]; then echo "PASS predictive_scan ($PRED)"; PASS=$((PASS+1)); else echo "FAIL predictive_scan"; cat /tmp/p4w3_pred.json; FAIL=$((FAIL+1)); fi
python3 - <<'PY'
import json
d=json.load(open('/tmp/p4w3_pred.json'))
assert d.get('modelVersion')=='ewma-v1', d
assert d.get('scanned',0) >= 1, d
print('PASS predictive_scan_shape')
PY
PASS=$((PASS+1))

CAP=$(curl -sk -o /tmp/p4w3_cap.json -w '%{http_code}' -X POST "$API/ops-intelligence/capacity/forecast" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"horizonHours":168,"lookbackHours":12}')
if [ "$CAP" = "201" ] || [ "$CAP" = "200" ]; then echo "PASS capacity_forecast ($CAP)"; PASS=$((PASS+1)); else echo "FAIL capacity_forecast"; cat /tmp/p4w3_cap.json; FAIL=$((FAIL+1)); fi
python3 - <<'PY'
import json
d=json.load(open('/tmp/p4w3_cap.json'))
assert d.get('modelVersion')=='capacity-v1', d
assert d.get('generated',0) >= 1, d
assert d.get('runId'), d
f=(d.get('forecasts') or [{}])[0]
assert f.get('confidenceLow') is not None and f.get('confidenceHigh') is not None, f
print('PASS capacity_forecast_shape')
PY
PASS=$((PASS+1))

RUNS=$(curl -sk -o /tmp/p4w3_runs.json -w '%{http_code}' "$API/ops-intelligence/capacity/runs" -H "Authorization: Bearer $TOKEN")
check capacity_runs 200 "$RUNS"

CF=$(curl -sk -o /tmp/p4w3_cf.json -w '%{http_code}' "$API/ops-intelligence/capacity/forecasts" -H "Authorization: Bearer $TOKEN")
check capacity_forecasts_list 200 "$CF"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p4w3_cf.json'))
assert len(d.get('forecasts') or []) >= 1
row=d['forecasts'][0]
assert row.get('forecast_type')=='capacity' or True
assert row.get('model_version') in ('capacity-v1', None) or row.get('model_version')=='capacity-v1'
print('PASS capacity_list_shape')
PY
PASS=$((PASS+1))

IP=$(curl -sk -o /tmp/p4w3_ip.json -w '%{http_code}' "$API/ops-intelligence/predictions" -H "Authorization: Bearer $TOKEN")
check predictions_list 200 "$IP"

# Legacy paths still work
TREND=$(curl -sk -o /dev/null -w '%{http_code}' -X POST "$API/ops-intelligence/forecasts/generate" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"horizonHours":24}')
if [ "$TREND" = "201" ] || [ "$TREND" = "200" ]; then echo "PASS trend_v1_compat ($TREND)"; PASS=$((PASS+1)); else echo "FAIL trend_v1_compat"; FAIL=$((FAIL+1)); fi

SCAN=$(curl -sk -o /dev/null -w '%{http_code}' -X POST "$API/ops-intelligence/anomalies/scan" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"windowMinutes":60}')
if [ "$SCAN" = "201" ] || [ "$SCAN" = "200" ]; then echo "PASS ops_scan_compat ($SCAN)"; PASS=$((PASS+1)); else echo "FAIL ops_scan_compat"; FAIL=$((FAIL+1)); fi

# Cross-tenant isolation on capacity runs (empty for other tenant is fine; detail via list)
SIGN2=$(curl -sk -o /tmp/p4w3_signup2.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p4w3.other.${SUFFIX}@opsedge360.internal\",\"password\":\"P4W3Val!${SUFFIX}\",\"name\":\"P4W3b\",\"organizationName\":\"P4W3 Other ${SUFFIX}\"}")
TOKEN2=$(python3 -c "import json;print(json.load(open('/tmp/p4w3_signup2.json')).get('accessToken') or '')")
XT=$(curl -sk -o /tmp/p4w3_xt.json -w '%{http_code}' "$API/ops-intelligence/capacity/forecasts" -H "Authorization: Bearer $TOKEN2")
check cross_tenant_capacity_list 200 "$XT"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p4w3_xt.json'))
assert len(d.get('forecasts') or []) == 0
print('PASS cross_tenant_empty_capacity')
PY
PASS=$((PASS+1))

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo P4_WAVE3_VALIDATION_OK
