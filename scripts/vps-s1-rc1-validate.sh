#!/bin/bash
# Sprint 1 RC1 product validation — Executive Command Center
set -euo pipefail
API="${API_BASE:-https://api.observability360.asoftechinsightz.com/api/v1}"
WEB="${WEB_BASE:-https://observability360.asoftechinsightz.com}"
OUT="${OUT_DIR:-/tmp/opsedge360-s1-rc1-evidence}"
mkdir -p "$OUT"

echo "=== S1 RC1 VALIDATE $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
cd /opt/OpsEdge360
echo "sha=$(git rev-parse HEAD)"
echo "subject=$(git log -1 --oneline)"

echo "=== deploy health ==="
curl -sk "$API/health" | tee "$OUT/health.json"; echo
echo "ready=$(curl -sk -o /dev/null -w '%{http_code}' "$API/ready")"
echo "live=$(curl -sk -o /dev/null -w '%{http_code}' "$API/live")"
echo "web=$(curl -sk -o /dev/null -w '%{http_code}' "$WEB/")"
echo "web_dashboard=$(curl -sk -o /dev/null -w '%{http_code}' "$WEB/dashboard")"

echo "=== containers ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod ps --format 'table {{.Name}}\t{{.Status}}' 2>/dev/null | head -40 | tee "$OUT/containers.txt" || docker ps --format '{{.Names}} {{.Status}}' | head -40 | tee "$OUT/containers.txt"

echo "=== demo enter ==="
curl -sk -X POST "$API/demo/ede/enter" -H 'Content-Type: application/json' -d '{}' > "$OUT/ede-enter.json"
TOKEN=$(python3 -c "import json;print(json.load(open('$OUT/ede-enter.json')).get('accessToken',''))")
test -n "$TOKEN"
AUTH="Authorization: Bearer $TOKEN"

# Ensure demo data for executive widgets
curl -sk -X POST "$API/demo/ede/load" -H "$AUTH" -H 'Content-Type: application/json' -d '{}' > "$OUT/ede-load.json" || true

echo "=== performance: dashboard executive ==="
START=$(date +%s%3N)
HTTP=$(curl -sk -o "$OUT/dashboard.json" -w '%{http_code}' -H "$AUTH" "$API/dashboard/executive?role=cio")
END=$(date +%s%3N)
echo "dashboard_http=$HTTP"
echo "dashboard_latency_ms=$((END-START))" | tee "$OUT/dashboard-latency.txt"

echo "=== performance: search ==="
START=$(date +%s%3N)
SHTTP=$(curl -sk -o "$OUT/search.json" -w '%{http_code}' -H "$AUTH" "$API/search?q=payment")
END=$(date +%s%3N)
echo "search_http=$SHTTP"
echo "search_latency_ms=$((END-START))" | tee "$OUT/search-latency.txt"

echo "=== performance: twin ==="
START=$(date +%s%3N)
THTTP=$(curl -sk -o "$OUT/twin.json" -w '%{http_code}' -H "$AUTH" "$API/twin/graph?limit=80")
END=$(date +%s%3N)
echo "twin_http=$THTTP"
echo "twin_latency_ms=$((END-START))" | tee "$OUT/twin-latency.txt"

echo "=== security: noauth ==="
echo "dashboard_noauth=$(curl -sk -o /dev/null -w '%{http_code}' "$API/dashboard/executive?role=cio")"
echo "search_noauth=$(curl -sk -o /dev/null -w '%{http_code}' "$API/search?q=x")"
echo "twin_noauth=$(curl -sk -o /dev/null -w '%{http_code}' "$API/twin/graph")"

python3 - <<'PY'
import json, os
out=os.environ.get("OUT","/tmp/opsedge360-s1-rc1-evidence")
# fix OUT from shell
out="/tmp/opsedge360-s1-rc1-evidence"
d=json.load(open(f"{out}/dashboard.json"))
# unwrap envelope if present
data=d.get("data") if isinstance(d,dict) and "data" in d else d
meta=d.get("metadata") if isinstance(d,dict) else {}
print("envelope_success", d.get("success"))
print("role", data.get("role") if isinstance(data,dict) else None)
print("dataMode", (meta or {}).get("dataMode") or data.get("kpis",{}).get("label"))
health=data.get("health") or []
print("health_count", len(health))
print("health_order", ",".join(h.get("id","") for h in health[:5]))
kpis=data.get("kpis") or {}
print("totalAssets", kpis.get("totalAssets"))
print("revenueAtRisk", kpis.get("revenueAtRisk"))
print("openAlerts", kpis.get("openAlerts"))
print("activeIncidents", kpis.get("activeIncidents"))
incs=(data.get("insights") or {}).get("recentIncidents") or []
print("incident_count", len(incs))
if incs:
  print("incident0_id", incs[0].get("id"))
  print("incident0_href", (incs[0].get("drilldown") or {}).get("href"))
actions=data.get("recommendedActions") or []
print("actions", len(actions))
bad=[a.get("id") for a in actions if not a.get("href") or a.get("href")=="#"]
print("actions_bad_href", bad)
narr=data.get("narrative") or {}
print("narrative_keys", sorted(narr.keys()))
for k in ("what","why","impact","next"):
  print(f"narrative_{k}", bool(narr.get(k)))
tables=data.get("tables") or []
svc=next((t for t in tables if t.get("id")=="table.services"), None)
rows=(svc or {}).get("rows") or []
print("service_rows", len(rows))
if rows:
  print("service0_href", rows[0].get("href"))
t=json.load(open(f"{out}/twin.json"))
print("twin_nodes", len(t.get("nodes") or []))
print("twin_edges", len(t.get("edges") or []))
# Journey probes
print("JOURNEY_DASHBOARD", "PASS" if health and kpis.get("totalAssets",0)>0 else "FAIL")
print("JOURNEY_BUSINESS_FIRST", "PASS" if health and health[0].get("id") in ("health.business","health.revenue") else "FAIL")
print("JOURNEY_INCIDENT_LINK", "PASS" if incs and "incident=" in str((incs[0].get("drilldown") or {}).get("href","")) else ("WARN" if not incs else "FAIL"))
print("JOURNEY_SERVICE_TWIN", "PASS" if rows and "/twin" in str(rows[0].get("href","")) else "FAIL")
print("JOURNEY_TWIN_GRAPH", "PASS" if len(t.get("nodes") or [])>0 and len(t.get("edges") or [])>0 else "FAIL")
print("JOURNEY_ACTIONS", "PASS" if actions and not bad else "FAIL")
PY

# Drill probes
INC=$(python3 -c "import json;d=json.load(open('/tmp/opsedge360-s1-rc1-evidence/dashboard.json'));data=d.get('data',d);incs=(data.get('insights') or {}).get('recentIncidents') or [];print(incs[0]['id'] if incs else '')")
if [ -n "$INC" ]; then
  echo "workspace_http=$(curl -sk -o "$OUT/workspace.json" -w '%{http_code}' -H "$AUTH" "$API/ops-intelligence/incidents/$INC/workspace")"
fi

# AI / RCA if incident exists
if [ -n "${INC:-}" ]; then
  curl -sk -H "$AUTH" -H 'Content-Type: application/json' -X POST "$API/ops-intelligence/rca" \
    -d "{\"incidentId\":\"$INC\",\"question\":\"RC1 executive incident summary and remediation\"}" > "$OUT/ai-rca.json" || true
  python3 - <<'PY'
import json
try:
  d=json.load(open("/tmp/opsedge360-s1-rc1-evidence/ai-rca.json"))
  print("ai_keys", list(d.keys())[:12])
  print("ai_summary", bool(d.get("summary")))
  print("ai_confidence", d.get("confidencePct"))
  print("ai_evidence", len(d.get("evidence") or []))
  print("ai_hypotheses", len(d.get("hypotheses") or []))
except Exception as e:
  print("ai_err", e)
PY
fi

# Reports list
echo "reports_http=$(curl -sk -o "$OUT/reports.json" -w '%{http_code}' -H "$AUTH" "$API/reports")"

# Audit sample
docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c "SELECT COUNT(*) AS activity_rows FROM ops_incident_activity;" 2>/dev/null | tee "$OUT/audit.txt" || true

echo "S1_RC1_VALIDATE_DONE OUT=$OUT"
