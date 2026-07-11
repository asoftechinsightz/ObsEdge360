#!/usr/bin/env bash
# Build Release Candidate packages (Compose + Helm + air-gap).
# Usage: ./scripts/package-rc.sh [OUT_DIR]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/dist/rc}"
STAMP="$(date +%Y%m%d%H%M%S)"
PKG="$OUT/opsedge360-v1.0.0-rc1-$STAMP"
mkdir -p "$PKG/compose" "$PKG/helm" "$PKG/docs" "$PKG/openapi" "$PKG/scripts"

cp -a "$ROOT/docker-compose.yml" "$PKG/compose/" 2>/dev/null || true
cp -a "$ROOT/docker-compose.prod.yml" "$PKG/compose/" 2>/dev/null || true
cp -a "$ROOT/docker-compose.ha.yml" "$PKG/compose/" 2>/dev/null || true
cp -a "$ROOT/infra/helm/opsedge360" "$PKG/helm/" 2>/dev/null || true
cp -a "$ROOT/docs/Wave8" "$PKG/docs/" 2>/dev/null || true
cp -a "$ROOT/docs/Wave7" "$PKG/docs/Wave7" 2>/dev/null || true
cp "$ROOT/scripts/airgap-package.sh" "$PKG/scripts/" 2>/dev/null || true
cp "$ROOT/scripts/airgap-verify.sh" "$PKG/scripts/" 2>/dev/null || true
cp "$ROOT/scripts/upgrade-onprem.sh" "$PKG/scripts/" 2>/dev/null || true
cp "$ROOT/scripts/demo-rc-seed.sh" "$PKG/scripts/" 2>/dev/null || true
cp "$ROOT/scripts/backup-postgres.sh" "$PKG/scripts/" 2>/dev/null || true
cp "$ROOT/scripts/restore-postgres.sh" "$PKG/scripts/" 2>/dev/null || true

# OpenAPI freeze from live API if available
API="${API_BASE:-https://api.observability360.asoftechinsightz.com}"
if curl -skf "$API/api/docs-json" -o "$PKG/openapi/openapi.json"; then
  echo "openapi_exported"
elif curl -skf "$API/api/v1/openapi.json" -o "$PKG/openapi/openapi.json"; then
  echo "openapi_exported_v1"
else
  echo '{"info":{"title":"OpsEdge360","version":"1.0.0-rc1"},"note":"Export from /api/docs-json after deploy"}' > "$PKG/openapi/openapi.json"
fi

cat > "$PKG/MANIFEST.json" <<EOF
{
  "product": "OpsEdge360",
  "version": "v1.0.0-rc1",
  "channel": "rc",
  "baseline": "v1.0.0-wave7",
  "packages": ["compose", "helm", "docs", "openapi", "scripts"],
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

ARCHIVE="$OUT/opsedge360-v1.0.0-rc1-$STAMP.tar.gz"
tar -C "$OUT" -czf "$ARCHIVE" "$(basename "$PKG")"
if command -v sha256sum >/dev/null; then
  sha256sum "$ARCHIVE" | tee "$ARCHIVE.sha256"
elif command -v shasum >/dev/null; then
  shasum -a 256 "$ARCHIVE" | tee "$ARCHIVE.sha256"
fi
echo "RC_PACKAGE_OK $ARCHIVE"
