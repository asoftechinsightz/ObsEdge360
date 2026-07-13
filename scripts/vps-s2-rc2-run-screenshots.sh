#!/bin/bash
set -euo pipefail
sed -i 's/\r$//' /tmp/vps-s2-rc2-screenshots.mjs || true
mkdir -p /tmp/opsedge360-s2-rc2-evidence/screenshots /tmp/oe360-shot-pkg
cp /tmp/vps-s2-rc2-screenshots.mjs /tmp/oe360-shot-pkg/shot.mjs
cat > /tmp/oe360-shot-pkg/package.json <<'EOF'
{"type":"module","dependencies":{"playwright":"1.49.1"}}
EOF
docker run --rm --network host \
  -v /tmp/opsedge360-s2-rc2-evidence:/evidence \
  -v /tmp/oe360-shot-pkg:/work \
  -w /work \
  -e OUT_DIR=/evidence/screenshots \
  -e TOKEN_FILE=/evidence/ede-enter.json \
  mcr.microsoft.com/playwright:v1.49.1-jammy \
  bash -lc 'npm install --silent && node shot.mjs'
ls -lh /tmp/opsedge360-s2-rc2-evidence/screenshots
cat /tmp/opsedge360-s2-rc2-evidence/screenshots/capture-summary.txt
echo RC2_SCREENSHOTS_DONE
