#!/usr/bin/env bash
# Generate SBOM / dependency inventory for commercial + GA sign-off.
# Prefers node (available in OpsEdge360 workspaces); falls back to python3.
# Usage: ./scripts/generate-sbom.sh [OUT_JSON]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/docs/commercial/sbom.json}"
mkdir -p "$(dirname "$OUT")"
cd "$ROOT"

if command -v node >/dev/null 2>&1; then
  OUT="$OUT" ROOT="$ROOT" node <<'NODE'
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const root = process.env.ROOT;
const out = process.env.OUT;

function loadPkg(p) {
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    return { name: data.name, version: data.version, path: path.relative(root, p).replace(/\\/g, '/') };
  } catch {
    return null;
  }
}

function walkPackageJson(dir, acc) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    let st;
    try { st = fs.statSync(p); } catch { continue; }
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
      const pj = path.join(p, 'package.json');
      if (fs.existsSync(pj)) {
        const row = loadPkg(pj);
        if (row) acc.push(row);
      } else {
        walkPackageJson(p, acc);
      }
    }
  }
}

const workspaces = [];
walkPackageJson(path.join(root, 'packages'), workspaces);
const apps = [];
const appsRoot = path.join(root, 'apps');
if (fs.existsSync(appsRoot)) {
  for (const name of fs.readdirSync(appsRoot).sort()) {
    const pj = path.join(appsRoot, name, 'package.json');
    if (fs.existsSync(pj)) {
      const row = loadPkg(pj);
      if (row) apps.push(row);
    }
  }
}
const services = [];
const svcRoot = path.join(root, 'services');
if (fs.existsSync(svcRoot)) {
  for (const name of fs.readdirSync(svcRoot).sort()) {
    const pj = path.join(svcRoot, name, 'package.json');
    if (fs.existsSync(pj)) {
      const row = loadPkg(pj);
      if (row) services.push(row);
    }
  }
}

const lockfiles = {};
for (const lock of ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock']) {
  const lp = path.join(root, lock);
  if (fs.existsSync(lp)) {
    const buf = fs.readFileSync(lp);
    lockfiles[lock] = { sha256: crypto.createHash('sha256').update(buf).digest('hex'), bytes: buf.length };
  }
}

let gitSha = null;
try { gitSha = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim(); } catch {}

const sbom = {
  bomFormat: 'OpsEdge360-SBOM-lite',
  specVersion: '1.1',
  product: 'OpsEdge360',
  version: 'commercial',
  generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  gitSha,
  lockfiles,
  components: { workspaces, apps, services },
  notes: [
    'Lite inventory for procurement. CI may also emit SPDX via anchore/sbom-action.',
    'Regenerate before each commercial drop.',
  ],
};
fs.writeFileSync(out, JSON.stringify(sbom, null, 2));
console.log('SBOM_OK', out, 'workspaces=', workspaces.length, 'apps=', apps.length, 'services=', services.length);
NODE
  exit 0
fi

if command -v python3 >/dev/null 2>&1; then
  python3 - <<PY
import json, os, time, hashlib
root = r"""$ROOT"""
out = r"""$OUT"""

def load_pkg(path):
    try:
        data = json.load(open(path, encoding="utf-8"))
        return {"name": data.get("name"), "version": data.get("version"), "path": os.path.relpath(path, root).replace("\\\\", "/")}
    except Exception:
        return None

components = {"workspaces": [], "apps": [], "services": []}
for dirpath, dirnames, files in os.walk(os.path.join(root, "packages")):
    dirnames[:] = [d for d in dirnames if d not in ("node_modules", "dist", ".git")]
    if "package.json" in files:
        row = load_pkg(os.path.join(dirpath, "package.json"))
        if row: components["workspaces"].append(row)
for name in sorted(os.listdir(os.path.join(root, "apps"))):
    p = os.path.join(root, "apps", name, "package.json")
    if os.path.isfile(p):
        row = load_pkg(p)
        if row: components["apps"].append(row)
svc_root = os.path.join(root, "services")
if os.path.isdir(svc_root):
    for name in sorted(os.listdir(svc_root)):
        p = os.path.join(svc_root, name, "package.json")
        if os.path.isfile(p):
            row = load_pkg(p)
            if row: components["services"].append(row)
lock_meta = {}
for lock in ["package-lock.json", "pnpm-lock.yaml", "yarn.lock"]:
    lp = os.path.join(root, lock)
    if os.path.isfile(lp):
        h = hashlib.sha256(open(lp, "rb").read()).hexdigest()
        lock_meta[lock] = {"sha256": h, "bytes": os.path.getsize(lp)}
sbom = {
    "bomFormat": "OpsEdge360-SBOM-lite",
    "specVersion": "1.1",
    "product": "OpsEdge360",
    "version": "commercial",
    "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "gitSha": os.popen("git rev-parse HEAD").read().strip() if os.path.isdir(os.path.join(root, ".git")) else None,
    "lockfiles": lock_meta,
    "components": components,
    "notes": ["Lite inventory for procurement. CI may also emit SPDX via anchore/sbom-action.", "Regenerate before each commercial drop."],
}
open(out, "w", encoding="utf-8").write(json.dumps(sbom, indent=2))
print("SBOM_OK", out, "workspaces=", len(components["workspaces"]), "apps=", len(components["apps"]), "services=", len(components["services"]))
PY
  exit 0
fi

echo "FAIL: need node or python3 to generate SBOM" >&2
exit 1
