#!/usr/bin/env bash
# Certify a backup artifact with SHA-256 (Wave 6 backup certification helper)
# Usage: ./scripts/backup-certify.sh /path/to/backup.sql.gz
set -euo pipefail
FILE="${1:-}"
if [[ -z "$FILE" || ! -f "$FILE" ]]; then
  echo "Usage: $0 <backup-file>"
  exit 1
fi
if command -v sha256sum >/dev/null; then
  SUM=$(sha256sum "$FILE" | awk '{print $1}')
elif command -v shasum >/dev/null; then
  SUM=$(shasum -a 256 "$FILE" | awk '{print $1}')
else
  SUM=$(python3 -c "import hashlib,sys;print(hashlib.sha256(open(sys.argv[1],'rb').read()).hexdigest())" "$FILE")
fi
SIZE=$(wc -c < "$FILE" | tr -d ' ')
echo "artifactPath=$FILE"
echo "checksumSha256=$SUM"
echo "sizeBytes=$SIZE"
echo "BACKUP_CERTIFY_OK"
