#!/usr/bin/env bash
# Quality gate for GA — fail on unsafe markers; TODO scan is advisory.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
FAIL=0
scan() {
  local pat="$1"
  if command -v rg >/dev/null; then
    rg -n --glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!**/.next/**' -e "$pat" apps services packages 2>/dev/null || true
  else
    grep -RIn --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.next -E "$pat" apps services packages 2>/dev/null || true
  fi
}
HITS=$(scan 'NOT_FOR_PRODUCTION|HARDCODED_SECRET' | head -20 || true)
if [ -n "$HITS" ]; then
  echo "$HITS"
  echo "QUALITY_FAIL unsafe_markers"; FAIL=1
else
  echo "PASS no_unsafe_markers"
fi
if [ -f "$ROOT/.env" ]; then
  if git check-ignore -q .env 2>/dev/null; then echo "PASS env_gitignored"; else echo "QUALITY_FAIL env_tracked"; FAIL=1; fi
else
  echo "PASS no_env_in_tree"
fi
[ "$FAIL" -eq 0 ]
echo "GA_QUALITY_OK"
