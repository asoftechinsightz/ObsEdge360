#!/bin/bash
# Sprint 2 RC2 product validation — Unified Observability Experience
set -euo pipefail
API="${API_BASE:-https://api.observability360.asoftechinsightz.com/api/v1}"
WEB="${WEB_BASE:-https://observability360.asoftechinsightz.com}"
OUT="${OUT_DIR:-/tmp/opsedge360-s2-rc2-evidence}"
mkdir -p "$OUT"

PASS=0
FAIL=0
pass() { echo "PASS: $*"; PASS=$((PASS+1)); }
fail() { echo "FAIL: $*"; FAIL=$((FAIL+1)); }

echo "=== S2 RC2 VALIDATE $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
cd /opt/OpsEdge360
echo "sha=$(git rev-parse HEAD)"
echo "subject=$(git log -1 --oneline)"

echo "=== 1. deployment health ==="
H=$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")
R=$(curl -sk -o /dev/null -w '%{http_code}' "$API/ready")
W=$(curl -sk -o /dev/null -w '%{http_code}' "$WEB/")
WO=$(curl -sk -o /dev/null -w '%{http_code}' "$WEB/observability")
echo "health=$H ready=$R web=$W web_observability=$WO"
[ "$H" = "200" ] && pass "health" || fail "health=$H"
[ "$R" = "200" ] && pass "ready" || fail "ready=$R"
[ "$W" = "200" ] && pass "web" || fail "web=$W"
[ "$WO" = "200" ] && pass "web_observability" || fail "web_observability=$WO"

echo "=== containers ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod ps --format 'table {{.Name}}\t{{.Status}}' 2>/dev/null | head -40 | tee "$OUT/containers.txt" || true

echo "=== 2. demo enter + observe seed ==="
curl -sk -X POST "$API/demo/ede/enter" -H 'Content-Type: application/json' -d '{}' > "$OUT/ede-enter.json"
TOKEN=$(python3 -c "import json;print(json.load(open('$OUT/ede-enter.json')).get('accessToken',''))")
if [ -z "$TOKEN" ]; then fail "ede_enter_token"; echo "ede_enter:"; head -c 400 "$OUT/ede-enter.json"; echo; exit 1; fi
pass "ede_enter"
AUTH="Authorization: Bearer $TOKEN"
curl -sk -X POST "$API/observe/demo/seed" -H "$AUTH" -H 'Content-Type: application/json' -d '{}' > "$OUT/observe-seed.json" || true
python3 -c "import json;d=json.load(open('$OUT/observe-seed.json'));print('seed_ok',d.get('ok'),'packs',d.get('packs'));print('brand',d.get('brand'))" || true

echo "=== 3. security noauth (must be 401) ==="
for path in observe/overview observe/logs observe/traces observe/topology; do
  code=$(curl -sk -o /dev/null -w '%{http_code}' "$API/$path")
  echo "${path}_noauth=$code"
  [ "$code" = "401" ] && pass "${path}_noauth" || fail "${path}_noauth=$code"
done

echo "=== 4. vendor neutrality scan (UI strings) ==="
# Customer pages must not advertise engine brands
for path in /observability /observability/logs /observability/traces /observability/topology; do
  body=$(curl -sk "$WEB$path" || true)
  if echo "$body" | grep -qiE 'skywalking|grafana|datadog|new relic|elastic apm'; then
    fail "vendor_brand_in_$path"
  else
    pass "vendor_neutral_$path"
  fi
done

echo "=== 5. functional observe APIs ==="
python3 - <<'PY'
import json, os, urllib.request, ssl
api=os.environ.get("API","https://api.observability360.asoftechinsightz.com/api/v1")
out="/tmp/opsedge360-s2-rc2-evidence"
token=json.load(open(f"{out}/ede-enter.json")).get("accessToken","")
ctx=ssl.create_default_context()
ctx.check_hostname=False
ctx.verify_mode=ssl.CERT_NONE

def get(path):
  req=urllib.request.Request(f"{api}/{path}", headers={"Authorization": f"Bearer {token}"})
  with urllib.request.urlopen(req, context=ctx, timeout=30) as r:
    body=r.read()
    open(f"{out}/{path.replace('/','_')}.json","wb").write(body)
    return r.status, json.loads(body)

results=[]
def check(name, ok, detail=""):
  print(("PASS" if ok else "FAIL")+f": {name}"+(f" {detail}" if detail else ""))
  results.append(ok)

st, ov = get("observe/overview")
check("overview_http", st==200)
check("overview_brand", ov.get("brand")=="OpsEdge360", ov.get("brand"))
check("overview_engine_label", "skywalking" not in (ov.get("engineLabel") or "").lower(), ov.get("engineLabel"))
domains=ov.get("domains") or []
check("overview_domains_ge_8", len(domains)>=8, str(len(domains)))
blob=json.dumps(ov).lower()
check("overview_no_vendor", not any(v in blob for v in ["skywalking","grafana","datadog","new relic"]))
narr=ov.get("narrative") or {}
check("narrative_complete", all(narr.get(k) for k in ("what","why","impact","next")))

for domain in ("applications","infrastructure","kubernetes","containers","databases"):
  st, d = get(f"observe/{domain}")
  items=d.get("items") or []
  check(f"{domain}_http", st==200)
  check(f"{domain}_populated", len(items)>=1, str(len(items)))
  if items:
    check(f"{domain}_twin_href", "/twin" in (items[0].get("twinHref") or ""))
    check(f"{domain}_no_vendor", "skywalking" not in json.dumps(items).lower())

st, logs = get("observe/logs?limit=50")
items=logs.get("items") or []
check("logs_http", st==200)
check("logs_populated", len(items)>=1, str(len(items)))

st, metrics = get("observe/metrics?limit=50")
mitems=metrics.get("items") or []
check("metrics_http", st==200)
check("metrics_populated", len(mitems)>=1, str(len(mitems)))

st, traces = get("observe/traces?limit=20")
titems=traces.get("items") or []
check("traces_http", st==200)
check("traces_populated", len(titems)>=1, str(len(titems)))
if titems:
  tid=titems[0]["traceId"]
  st, detail = get(f"observe/traces/{tid}")
  check("trace_detail_http", st==200)
  check("trace_spans", len(detail.get("spans") or [])>=1)

st, topo = get("observe/topology")
check("topology_http", st==200)
check("topology_nodes", len(topo.get("nodes") or [])>=1, str(len(topo.get("nodes") or [])))
check("topology_edges", len(topo.get("edges") or [])>=1, str(len(topo.get("edges") or [])))

# AI explain
import urllib.request
req=urllib.request.Request(
  f"{api}/observe/ai/explain",
  data=json.dumps({"kind":"application","name":"UPI Payments Fabric","prompt":"Explain"}).encode(),
  headers={"Authorization": f"Bearer {token}", "Content-Type":"application/json"},
  method="POST",
)
with urllib.request.urlopen(req, context=ctx, timeout=30) as r:
  ai=json.loads(r.read())
  open(f"{out}/observe_ai_explain.json","w").write(json.dumps(ai, indent=2))
check("ai_summary", bool(ai.get("summary")))
check("ai_evidence", isinstance(ai.get("evidence"), list) and len(ai.get("evidence") or [])>=1)
check("ai_confidence", ai.get("confidence") is not None)
check("ai_brand", ai.get("brand")=="OpsEdge360")
check("ai_no_vendor", "skywalking" not in json.dumps(ai).lower())

# Journey pages
web=os.environ.get("WEB","https://observability360.asoftechinsightz.com")
for path in (
  "/observability","/observability/applications","/observability/logs",
  "/observability/metrics","/observability/traces","/observability/topology",
  "/observability/kubernetes","/observability/databases",
):
  req=urllib.request.Request(web+path)
  with urllib.request.urlopen(req, context=ctx, timeout=30) as r:
    code=r.status
  check(f"page{path.replace('/','_')}", code==200, str(code))

open(f"{out}/functional-summary.txt","w").write(
  f"pass={sum(1 for x in results if x)} fail={sum(1 for x in results if not x)} total={len(results)}\n"
)
print("FUNCTIONAL_SUMMARY", f"pass={sum(1 for x in results if x)} fail={sum(1 for x in results if not x)}")
if sum(1 for x in results if not x) > 0:
  raise SystemExit(2)
PY

echo "=== 6. performance (python) ==="
python3 /tmp/vps-s2-rc2-perf.py | tee "$OUT/perf.txt"

echo "=== RC2 VALIDATE DONE ==="
echo "shell_pass=$PASS shell_fail=$FAIL"
