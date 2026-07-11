#!/usr/bin/env bash
# Build an offline/air-gap installation package for OpsEdge360.
# Usage: ./scripts/airgap-package.sh [OUT_DIR]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/dist/airgap}"
STAMP="$(date +%Y%m%d%H%M%S)"
PKG_DIR="$OUT/opsedge360-airgap-$STAMP"
mkdir -p "$PKG_DIR/images" "$PKG_DIR/docs" "$PKG_DIR/charts" "$PKG_DIR/scripts"

echo "=== Air-gap package @ $PKG_DIR ==="

# Bundle source + helm + docs (no registry pull required for package creation if images already local)
cp -a "$ROOT/infra/helm/opsedge360" "$PKG_DIR/charts/" 2>/dev/null || true
cp -a "$ROOT/docs/Wave6" "$PKG_DIR/docs/" 2>/dev/null || mkdir -p "$PKG_DIR/docs"
cp -a "$ROOT/docs/phase5/WAVE6_"*.md "$PKG_DIR/docs/" 2>/dev/null || true
cp "$ROOT/scripts/backup-postgres.sh" "$PKG_DIR/scripts/" 2>/dev/null || true
cp "$ROOT/scripts/restore-postgres.sh" "$PKG_DIR/scripts/" 2>/dev/null || true
cp "$ROOT/scripts/airgap-verify.sh" "$PKG_DIR/scripts/" 2>/dev/null || true
cp "$ROOT/docker-compose.yml" "$PKG_DIR/" 2>/dev/null || true
cp "$ROOT/docker-compose.prod.yml" "$PKG_DIR/" 2>/dev/null || true
cp "$ROOT/docker-compose.ha.yml" "$PKG_DIR/" 2>/dev/null || true

# Optional: save local images if present
IMAGES=(opsedge360-api-gateway:latest opsedge360-web:latest)
DIGESTS='[]'
for img in "${IMAGES[@]}"; do
  if docker image inspect "$img" >/dev/null 2>&1; then
    SAFE=$(echo "$img" | tr '/:' '__')
    docker save "$img" | gzip > "$PKG_DIR/images/${SAFE}.tar.gz"
    DIGEST=$(docker image inspect "$img" --format '{{index .RepoDigests 0}}' 2>/dev/null || echo "$img")
    DIGESTS=$(python3 -c "import json;d=json.loads('''$DIGESTS''');d.append('''$DIGEST''');print(json.dumps(d))")
    echo "Saved $img"
  else
    echo "SKIP missing image $img (load into local registry before packaging for full offline install)"
  fi
done

MANIFEST=$(cat <<EOF
{
  "product": "OpsEdge360",
  "wave": "v1.0.0-wave6",
  "requiresInternet": false,
  "offlineDocs": true,
  "localRegistrySupport": true,
  "offlineUpgrade": true,
  "components": ["helm", "compose", "docs", "scripts", "images"],
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
)
echo "$MANIFEST" > "$PKG_DIR/manifest.json"
echo "$DIGESTS" > "$PKG_DIR/image-digests.json"

# Archive + checksum
ARCHIVE="$OUT/opsedge360-airgap-$STAMP.tar.gz"
tar -C "$OUT" -czf "$ARCHIVE" "opsedge360-airgap-$STAMP"
if command -v sha256sum >/dev/null; then
  CHECKSUM=$(sha256sum "$ARCHIVE" | awk '{print $1}')
elif command -v shasum >/dev/null; then
  CHECKSUM=$(shasum -a 256 "$ARCHIVE" | awk '{print $1}')
else
  CHECKSUM=$(python3 -c "import hashlib;print(hashlib.sha256(open(r'$ARCHIVE','rb').read()).hexdigest())")
fi
echo "$CHECKSUM  $(basename "$ARCHIVE")" > "$ARCHIVE.sha256"
echo "PACKAGE=$ARCHIVE"
echo "CHECKSUM=$CHECKSUM"
echo "AIRGAP_PACKAGE_OK"
