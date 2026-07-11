#!/usr/bin/env bash
# Export OpenAPI JSON for documentation freeze.
set -euo pipefail
API="${API_BASE:-https://api.observability360.asoftechinsightz.com}"
OUT="${1:-docs/Wave8/openapi.rc1.json}"
mkdir -p "$(dirname "$OUT")"
curl -skf "$API/api/docs-json" -o "$OUT" || curl -skf "$API/api/v1/openapi.json" -o "$OUT"
python3 - <<PY
import json
d=json.load(open("$OUT"))
assert d.get("openapi") or d.get("swagger") or d.get("info")
info=d.get("info") or {}
print("title=", info.get("title"))
print("version=", info.get("version"))
paths=len(d.get("paths") or {})
print("paths=", paths)
assert paths >= 10
print("OPENAPI_EXPORT_OK")
PY
