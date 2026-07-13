#!/bin/bash
set -euo pipefail
API=https://api.observability360.asoftechinsightz.com/api/v1
OUT=/tmp/opsedge360-s3-rc3-evidence
mkdir -p "$OUT"
curl -sk -X POST "$API/demo/ede/enter" -H 'Content-Type: application/json' -d '{}' > "$OUT/ede-enter.json"
TOKEN=$(python3 -c "import json;print(json.load(open('$OUT/ede-enter.json')).get('accessToken',''))")
AUTH="Authorization: Bearer $TOKEN"
curl -sk "$API/twin/business-services" -H "$AUTH" > /tmp/bs.json
python3 <<'PY'
import json
items=json.load(open('/tmp/bs.json')).get('items') or []
print('count', len(items))
owned=[s for s in items if any((s.get('ownership') or {}).get(k) for k in ('businessOwner','operationsOwner','supportTeam','onCallTeam'))]
print('owned_count', len(owned))
for s in items[:8]:
  print('sample', s.get('name'), s.get('tier'), s.get('ownership'))
pref=next((x for x in items if 'upi' in x.get('name','').lower()), None) or (owned[0] if owned else items[0])
print('PREF', pref['id'], pref['name'], pref.get('ownership'))
open('/tmp/pref.json','w').write(json.dumps(pref))
PY
SID=$(python3 -c "import json;print(json.load(open('/tmp/pref.json'))['id'])")
echo "SID=$SID"
echo '=== SNAPSHOT ==='
curl -sk -o /tmp/snap.json -w 'HTTP=%{http_code}\n' -X POST "$API/twin/business-services/$SID/snapshot" -H "$AUTH" -H 'Content-Type: application/json' -d '{}'
cat /tmp/snap.json; echo
echo '=== AI ==='
curl -sk -o /tmp/ai.json -w 'HTTP=%{http_code}\n' -X POST "$API/twin/ai/explain" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"serviceId\":\"$SID\",\"name\":\"UPI\",\"prompt\":\"blast\"}"
python3 -c "import json;d=json.load(open('/tmp/ai.json'));print({k:d.get(k) for k in ('brand','summary','confidence','businessImpact')});print('evidence',len(d.get('evidence') or []))"
echo '=== gateway logs ==='
docker logs opsedge360-api-gateway-1 --tail 60 2>&1 | tail -40
