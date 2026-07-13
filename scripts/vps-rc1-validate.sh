#!/bin/bash
# RC1 post-deploy validation — migration 049, twin, search, workspace, scenarios
set -euo pipefail
API="${API_BASE:-https://api.observability360.asoftechinsightz.com/api/v1}"
WEB="${WEB_BASE:-https://observability360.asoftechinsightz.com}"
OUT="${OUT_DIR:-/tmp/opsedge360-rc1-evidence}"
mkdir -p "$OUT"

echo "=== RC1 VALIDATE $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
cd /opt/OpsEdge360
echo "sha=$(git rev-parse HEAD)"
echo "subject=$(git log -1 --oneline)"

echo "=== health ==="
curl -sk "$API/health" | tee "$OUT/health.json"; echo
echo "ready=$(curl -sk -o /dev/null -w '%{http_code}' "$API/ready")"
echo "live=$(curl -sk -o /dev/null -w '%{http_code}' "$API/live")"
echo "web=$(curl -sk -o /dev/null -w '%{http_code}' "$WEB/")"

echo "=== migration 049 tables ==="
docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c "\d ops_incident_activity" > "$OUT/mig049-activity.txt" 2>&1 || true
docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c "\d ops_incident_comments" > "$OUT/mig049-comments.txt" 2>&1 || true
docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c "\d ops_incident_watchers" > "$OUT/mig049-watchers.txt" 2>&1 || true
docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c "SELECT column_name FROM information_schema.columns WHERE table_name='ops_incidents' AND column_name IN ('owner_id','priority','business_impact','workspace_state','closure_report_id') ORDER BY 1;" | tee "$OUT/mig049-columns.txt"

echo "=== demo enter ==="
curl -sk -X POST "$API/demo/ede/enter" -H 'Content-Type: application/json' -d '{}' > "$OUT/ede-enter.json"
TOKEN=$(python3 -c "import json;print(json.load(open('$OUT/ede-enter.json')).get('accessToken',''))")
test -n "$TOKEN"
AUTH="Authorization: Bearer $TOKEN"

echo "=== EDE reset (admin path may fail on demo cio — try load) ==="
curl -sk -X POST "$API/demo/ede/reset" -H "$AUTH" -H 'Content-Type: application/json' -d '{}' | tee "$OUT/ede-reset.json" | head -c 400; echo
# Also try load
curl -sk -X POST "$API/demo/ede/load" -H "$AUTH" -H 'Content-Type: application/json' -d '{}' | tee "$OUT/ede-load.json" | head -c 400; echo

echo "=== twin graph ==="
curl -sk -H "$AUTH" "$API/twin/graph?limit=80" > "$OUT/twin.json"
python3 - <<PY
import json
t=json.load(open("$OUT/twin.json"))
print("twin_nodes", len(t.get("nodes") or []))
print("twin_edges", len(t.get("edges") or []))
print("twin_source", t.get("source") or t.get("label") or "live")
PY

echo "=== search ==="
echo "search_http=$(curl -sk -o "$OUT/search.json" -w '%{http_code}' -H "$AUTH" "$API/search?q=payment")"
python3 - <<PY
import json
s=json.load(open("$OUT/search.json"))
print("search_total", s.get("total"))
print("search_cats", ",".join(f"{c['id']}:{len(c['results'])}" for c in (s.get("categories") or [])))
PY

echo "=== incidents + workspace ==="
curl -sk -H "$AUTH" "$API/ops-intelligence/incidents" > "$OUT/incidents.json"
python3 - <<'PY'
import json, os
incs=json.load(open(os.environ.get("OUT","/tmp/opsedge360-rc1-evidence")+"/incidents.json" if False else "/tmp/opsedge360-rc1-evidence/incidents.json"))
arr=incs.get("incidents") or []
print("incidents", len(arr))
open("/tmp/opsedge360-rc1-evidence/first_incident_id.txt","w").write(arr[0]["id"] if arr else "")
PY
INC=$(cat "$OUT/first_incident_id.txt")
if [ -n "$INC" ]; then
  echo "workspace_http=$(curl -sk -o "$OUT/workspace.json" -w '%{http_code}' -H "$AUTH" "$API/ops-intelligence/incidents/$INC/workspace")"
  python3 - <<PY
import json
w=json.load(open("$OUT/workspace.json"))
inc=(w.get("incident") or {})
print("workspace_title", inc.get("title"))
print("workspace_status", inc.get("status"))
print("impact_service", (inc.get("businessImpact") or {}).get("businessService"))
print("next_statuses", ",".join(w.get("nextStatuses") or []))
PY
  # Scenario 1 path: assign → ack → investigate → rca → verify → close
  curl -sk -H "$AUTH" -H 'Content-Type: application/json' -X POST "$API/ops-intelligence/incidents/$INC/transition" -d '{"status":"assigned","note":"RC1 Scenario1 assign"}' > "$OUT/s1-assigned.json" || true
  curl -sk -H "$AUTH" -H 'Content-Type: application/json' -X POST "$API/ops-intelligence/incidents/$INC/transition" -d '{"status":"acknowledged","note":"RC1 ack"}' > "$OUT/s1-ack.json" || true
  curl -sk -H "$AUTH" -H 'Content-Type: application/json' -X POST "$API/ops-intelligence/incidents/$INC/transition" -d '{"status":"investigating","note":"RC1 investigate"}' > "$OUT/s1-inv.json" || true
  curl -sk -H "$AUTH" -H 'Content-Type: application/json' -X POST "$API/ops-intelligence/rca" -d "{\"incidentId\":\"$INC\",\"question\":\"RC1 payment gateway root cause\"}" > "$OUT/s1-rca.json" || true
  curl -sk -H "$AUTH" -H 'Content-Type: application/json' -X POST "$API/ops-intelligence/remediation/request" -d "{\"action\":\"restart_service\",\"actionKey\":\"restart_service\",\"incidentId\":\"$INC\",\"riskTier\":\"medium\",\"executionMode\":\"dry_run\"}" > "$OUT/s1-dryrun.json" || true
  curl -sk -H "$AUTH" -X POST "$API/ops-intelligence/incidents/$INC/verify" -H 'Content-Type: application/json' -d '{}' > "$OUT/s1-verify.json" || true
  curl -sk -H "$AUTH" -X POST "$API/ops-intelligence/incidents/$INC/close-and-report" -H 'Content-Type: application/json' -d '{}' > "$OUT/s1-close.json" || true
  python3 - <<PY
import json
for name in ["s1-rca","s1-verify","s1-close"]:
  try:
    d=json.load(open(f"/tmp/opsedge360-rc1-evidence/{name}.json"))
    print(name, "keys", list(d.keys())[:8])
  except Exception as e:
    print(name, "ERR", e)
PY
fi

echo "=== security + network ==="
echo "security_dash=$(curl -sk -o /dev/null -w '%{http_code}' -H "$AUTH" "$API/security/dashboard")"
echo "security_posture=$(curl -sk -o /dev/null -w '%{http_code}' -H "$AUTH" "$API/security/posture")"
echo "network_flows=$(curl -sk -o /dev/null -w '%{http_code}' -H "$AUTH" "$API/network/flows")"
echo "dashboard=$(curl -sk -o /dev/null -w '%{http_code}' -H "$AUTH" "$API/dashboard/executive?role=cio")"

echo "=== activity audit rows ==="
docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c "SELECT COUNT(*) AS activity_rows FROM ops_incident_activity;" | tee "$OUT/audit-count.txt"

echo "RC1_VALIDATE_DONE OUT=$OUT"
