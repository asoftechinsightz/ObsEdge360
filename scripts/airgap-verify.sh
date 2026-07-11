#!/usr/bin/env bash
# Verify an air-gap package checksum and manifest.
# Usage: ./scripts/airgap-verify.sh /path/to/opsedge360-airgap-*.tar.gz
set -euo pipefail
ARCHIVE="${1:-}"
if [[ -z "$ARCHIVE" || ! -f "$ARCHIVE" ]]; then
  echo "Usage: $0 <airgap-archive.tar.gz>"
  exit 1
fi
SUMFILE="${ARCHIVE}.sha256"
if [[ ! -f "$SUMFILE" ]]; then
  echo "Missing $SUMFILE"
  exit 1
fi
EXPECTED=$(awk '{print $1}' "$SUMFILE" | head -1)
if command -v sha256sum >/dev/null; then
  GOT=$(sha256sum "$ARCHIVE" | awk '{print $1}')
elif command -v shasum >/dev/null; then
  GOT=$(shasum -a 256 "$ARCHIVE" | awk '{print $1}')
else
  GOT=$(python3 -c "import hashlib,sys;print(hashlib.sha256(open(sys.argv[1],'rb').read()).hexdigest())" "$ARCHIVE")
fi
echo "expected=$EXPECTED"
echo "got=$GOT"
if [[ "$EXPECTED" != "$GOT" ]]; then
  echo "AIRGAP_VERIFY_FAIL checksum mismatch"
  exit 1
fi
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
tar -tzf "$ARCHIVE" | head -20
tar -xzf "$ARCHIVE" -C "$TMP"
MANIFEST=$(find "$TMP" -name manifest.json | head -1)
python3 - <<PY
import json
m=json.load(open("$MANIFEST"))
assert m.get("requiresInternet") is False
assert m.get("offlineDocs") is True
print("manifest_ok", m.get("wave"))
PY
echo "AIRGAP_VERIFY_OK"
echo "CHECKSUM=$GOT"
