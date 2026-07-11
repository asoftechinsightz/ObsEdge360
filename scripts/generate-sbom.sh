#!/usr/bin/env bash
# Generate a lightweight SBOM / dependency inventory for GA sign-off.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/docs/Wave9/sbom.json}"
mkdir -p "$(dirname "$OUT")"
cd "$ROOT"
python3 - <<PY
import json, os, hashlib, time
root = r"""$ROOT"""
pkgs = []
for dirpath, _, files in os.walk(os.path.join(root, "packages")):
    if "package.json" in files:
        p = os.path.join(dirpath, "package.json")
        try:
            data = json.load(open(p))
            pkgs.append({"name": data.get("name"), "version": data.get("version"), "path": os.path.relpath(p, root)})
        except Exception:
            pass
apps = []
for name in ["api-gateway", "web"]:
    p = os.path.join(root, "apps", name, "package.json")
    if os.path.isfile(p):
        data = json.load(open(p))
        apps.append({"name": data.get("name"), "version": data.get("version")})
sbom = {
    "bomFormat": "OpsEdge360-SBOM-lite",
    "specVersion": "1.0",
    "version": "v1.0.0",
    "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "components": {"workspaces": pkgs, "apps": apps},
}
open(r"""$OUT""", "w").write(json.dumps(sbom, indent=2))
print("SBOM_OK", r"""$OUT""", "workspaces=", len(pkgs))
PY
