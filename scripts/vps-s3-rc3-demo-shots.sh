#!/bin/bash
# Run screenshots + demo journey after validate (Playwright in web container or host node)
set -euo pipefail
OUT=/tmp/opsedge360-s3-rc3-evidence
SHOTS="$OUT/screenshots"
mkdir -p "$SHOTS"

# Prefer dockerized playwright if available via web image node
if command -v node >/dev/null 2>&1 && node -e "require('playwright')" 2>/dev/null; then
  OUT_DIR="$SHOTS" TOKEN_FILE="$OUT/ede-enter.json" SELECTED_SERVICE="$OUT/selected-service.json" \
    node /tmp/vps-s3-rc3-screenshots.mjs | tee "$OUT/screenshots-log.txt"
elif docker images --format '{{.Repository}}' | grep -q playwright; then
  docker run --rm --network host \
    -v "$OUT:/evidence" \
    -v /tmp/vps-s3-rc3-screenshots.mjs:/shots.mjs:ro \
    mcr.microsoft.com/playwright:v1.49.0-jammy \
    node /shots.mjs | tee "$OUT/screenshots-log.txt"
else
  # Fallback: use api-gateway/web host with npx playwright if present in /opt/OpsEdge360
  cd /opt/OpsEdge360/apps/web || cd /opt/OpsEdge360
  if [ -d node_modules/playwright ] || [ -d apps/web/node_modules/playwright ]; then
    OUT_DIR="$SHOTS" TOKEN_FILE="$OUT/ede-enter.json" SELECTED_SERVICE="$OUT/selected-service.json" \
      node /tmp/vps-s3-rc3-screenshots.mjs | tee "$OUT/screenshots-log.txt"
  else
    echo "WARN: playwright not available — capturing API HTML text evidence only"
    mkdir -p "$SHOTS"
    echo "playwright_unavailable" > "$SHOTS/capture-summary.txt"
  fi
fi

python3 /tmp/vps-s3-rc3-demo-journey.py | tee "$OUT/demo-journey-log.txt"
echo S3_RC3_DEMO_SHOTS_DONE
