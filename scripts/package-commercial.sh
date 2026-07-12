#!/usr/bin/env bash
# OpsEdge360 commercial production release package
# Usage: ./scripts/package-commercial.sh [OUT_DIR]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/dist/commercial}"
STAMP="$(date +%Y%m%d%H%M%S)"
SHA="$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || echo unknown)"
SHORT="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
PKG="$OUT/opsedge360-commercial-$SHORT-$STAMP"
mkdir -p "$PKG/compose" "$PKG/helm" "$PKG/docs" "$PKG/openapi" "$PKG/scripts" "$PKG/config" "$PKG/sbom"

# Compose + Helm
cp -a "$ROOT/docker-compose.yml" "$PKG/compose/" 2>/dev/null || true
cp -a "$ROOT/docker-compose.prod.yml" "$PKG/compose/" 2>/dev/null || true
cp -a "$ROOT/docker-compose.ha.yml" "$PKG/compose/" 2>/dev/null || true
cp -a "$ROOT/docker-compose.demo.yml" "$PKG/compose/" 2>/dev/null || true
cp -a "$ROOT/infra/helm/opsedge360" "$PKG/helm/" 2>/dev/null || true

# Docs — commercial first, then pilot/rc lineage
cp -a "$ROOT/docs/commercial" "$PKG/docs/" 2>/dev/null || true
cp -a "$ROOT/docs/pilot" "$PKG/docs/" 2>/dev/null || true
cp -a "$ROOT/docs/rc3" "$PKG/docs/" 2>/dev/null || true
cp -a "$ROOT/docs/rc2" "$PKG/docs/" 2>/dev/null || true
cp -a "$ROOT/docs/Wave9" "$PKG/docs/" 2>/dev/null || true
cp -a "$ROOT/docs/releases" "$PKG/docs/releases" 2>/dev/null || true

# Scripts customers need
for s in \
  airgap-package.sh airgap-verify.sh upgrade-onprem.sh \
  backup-postgres.sh backup-postgres.ps1 restore-postgres.sh backup-redis-meta.sh backup-certify.sh \
  generate-sbom.sh diagnostics-bundle.sh dr-validate.sh commercial-validate.sh \
  package-commercial.sh vps-rc3-validate.sh
do
  cp -a "$ROOT/scripts/$s" "$PKG/scripts/" 2>/dev/null || true
done

# SBOM
bash "$ROOT/scripts/generate-sbom.sh" "$PKG/sbom/sbom.json"
cp -f "$PKG/sbom/sbom.json" "$ROOT/docs/commercial/sbom.json" 2>/dev/null || true

# Env sample — no secrets
cat > "$PKG/config/env.sample" <<'EOF'
# OpsEdge360 commercial — replace all values; never commit real secrets
NODE_ENV=production
AUTHZ_ENFORCE=true
JWT_SECRET=replace-me-with-strong-secret
JWT_EXPIRES_IN=8h
SERVICE_JWT_SECRET=replace-me
SECRETS_PROVIDER=local
SECRETS_MASTER_KEY=replace-with-openssl-rand-base64-32
POSTGRES_PASSWORD=replace-me
REDIS_URL=redis://redis:6379
# Leave unset for customer deployments:
# OPS_MFA_LAB_CODES=
EOF

# OpenAPI freeze
API="${API_BASE:-https://api.observability360.asoftechinsightz.com}"
curl -skf "$API/api/docs-json" -o "$PKG/openapi/openapi.json" 2>/dev/null || \
  curl -skf "$API/api/v1/openapi.json" -o "$PKG/openapi/openapi.json" 2>/dev/null || \
  echo '{"info":{"title":"OpsEdge360","version":"commercial","note":"Export from /api/docs-json after deploy"}}' > "$PKG/openapi/openapi.json"

cat > "$PKG/README.md" <<EOF
# OpsEdge360 Commercial Release

SHA: $SHA
Built: $(date -u +%Y-%m-%dT%H:%M:%SZ)

Start: docs/commercial/README.md
Eval: docs/commercial/CUSTOMER_EVALUATION_PACKAGE.md
Install: docs/commercial/PRODUCTION_RELEASE_PACKAGE.md
EOF

cat > "$PKG/MANIFEST.json" <<EOF
{
  "product": "OpsEdge360",
  "company": "AsoftechInsightz",
  "channel": "commercial",
  "baseline": "rc3-epp",
  "gitSha": "$SHA",
  "packages": ["compose", "helm", "docs", "openapi", "sbom", "scripts", "config"],
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

ARCHIVE="$OUT/opsedge360-commercial-$SHORT-$STAMP.tar.gz"
tar -C "$OUT" -czf "$ARCHIVE" "$(basename "$PKG")"
if command -v sha256sum >/dev/null; then sha256sum "$ARCHIVE" | tee "$ARCHIVE.sha256"
elif command -v shasum >/dev/null; then shasum -a 256 "$ARCHIVE" | tee "$ARCHIVE.sha256"; fi
echo "COMMERCIAL_PACKAGE_OK $ARCHIVE"
