#!/usr/bin/env bash
# GA production package (Compose + Helm + air-gap helpers + docs + OpenAPI + env samples)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/dist/ga}"
STAMP="$(date +%Y%m%d%H%M%S)"
PKG="$OUT/opsedge360-v1.0.0-$STAMP"
mkdir -p "$PKG/compose" "$PKG/helm" "$PKG/docs" "$PKG/openapi" "$PKG/scripts" "$PKG/config"

cp -a "$ROOT/docker-compose.yml" "$PKG/compose/" 2>/dev/null || true
cp -a "$ROOT/docker-compose.prod.yml" "$PKG/compose/" 2>/dev/null || true
cp -a "$ROOT/docker-compose.ha.yml" "$PKG/compose/" 2>/dev/null || true
cp -a "$ROOT/infra/helm/opsedge360" "$PKG/helm/" 2>/dev/null || true
cp -a "$ROOT/docs/Wave9" "$PKG/docs/" 2>/dev/null || true
cp -a "$ROOT/docs/Wave8" "$PKG/docs/Wave8" 2>/dev/null || true
cp "$ROOT/CHANGELOG.md" "$PKG/docs/" 2>/dev/null || true
cp "$ROOT/scripts/airgap-package.sh" "$PKG/scripts/" 2>/dev/null || true
cp "$ROOT/scripts/airgap-verify.sh" "$PKG/scripts/" 2>/dev/null || true
cp "$ROOT/scripts/upgrade-onprem.sh" "$PKG/scripts/" 2>/dev/null || true
cp "$ROOT/scripts/package-rc.sh" "$PKG/scripts/" 2>/dev/null || true
cp "$ROOT/scripts/package-ga.sh" "$PKG/scripts/" 2>/dev/null || true

# Env sample — no secrets
cat > "$PKG/config/env.sample" <<'EOF'
# OpsEdge360 v1.0.0 — sample environment (replace all values; never commit real secrets)
NODE_ENV=production
AUTHZ_ENFORCE=true
JWT_SECRET=replace-me
SERVICE_JWT_SECRET=replace-me
SECRETS_PROVIDER=local
SECRETS_MASTER_KEY=replace-with-openssl-rand-base64-32
POSTGRES_PASSWORD=replace-me
REDIS_URL=redis://redis:6379
EOF

API="${API_BASE:-https://api.observability360.asoftechinsightz.com}"
curl -skf "$API/api/docs-json" -o "$PKG/openapi/openapi.json" || \
  curl -skf "$API/api/v1/openapi.json" -o "$PKG/openapi/openapi.json" || \
  echo '{"info":{"title":"OpsEdge360","version":"1.0.0"}}' > "$PKG/openapi/openapi.json"

cat > "$PKG/MANIFEST.json" <<EOF
{
  "product": "OpsEdge360",
  "company": "AsoftechInsightz",
  "version": "v1.0.0",
  "channel": "ga",
  "baselineRc": "v1.0.0-rc1",
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

ARCHIVE="$OUT/opsedge360-v1.0.0-$STAMP.tar.gz"
tar -C "$OUT" -czf "$ARCHIVE" "$(basename "$PKG")"
if command -v sha256sum >/dev/null; then sha256sum "$ARCHIVE" | tee "$ARCHIVE.sha256"
elif command -v shasum >/dev/null; then shasum -a 256 "$ARCHIVE" | tee "$ARCHIVE.sha256"; fi
echo "GA_PACKAGE_OK $ARCHIVE"
