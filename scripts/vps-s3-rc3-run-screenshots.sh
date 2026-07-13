#!/bin/bash
set -euo pipefail
sed -i 's/\r$//' /tmp/vps-s3-rc3-screenshots.mjs || true
mkdir -p /tmp/opsedge360-s3-rc3-evidence/screenshots /tmp/oe360-s3-shot-pkg
cp /tmp/vps-s3-rc3-screenshots.mjs /tmp/oe360-s3-shot-pkg/shot.mjs
cat > /tmp/oe360-s3-shot-pkg/package.json <<'EOF'
{"type":"module","dependencies":{"playwright":"1.49.1"}}
EOF
docker run --rm --network host \
  -v /tmp/opsedge360-s3-rc3-evidence:/evidence \
  -v /tmp/oe360-s3-shot-pkg:/work \
  -w /work \
  -e OUT_DIR=/evidence/screenshots \
  -e TOKEN_FILE=/evidence/ede-enter.json \
  -e SELECTED_SERVICE=/evidence/selected-service.json \
  mcr.microsoft.com/playwright:v1.49.1-jammy \
  bash -lc 'npm install --silent && node shot.mjs'
ls -lh /tmp/opsedge360-s3-rc3-evidence/screenshots
cat /tmp/opsedge360-s3-rc3-evidence/screenshots/capture-summary.txt
echo RC3_SCREENSHOTS_DONE
