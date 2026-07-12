# Diagnostics Bundle

## Purpose

Give support a single archive of non-secret operational context.

## Generate

```bash
bash scripts/diagnostics-bundle.sh
# → dist/diagnostics/opsedge360-diagnostics-<stamp>.tar.gz
```

## Typical contents

- `git-head.txt`, `git-status.txt`  
- `compose-ps.txt`, `docker-ps.txt`  
- `health.json`, `ready.txt`, `version.txt`  
- `gateway-logs-tail.txt` (last N lines)  
- `disk.txt`, `uptime.txt`  
- `env-keys.txt` (**names only**, never values)  
- `manifest-notes.txt`  

## Customer instructions

1. Reproduce issue.  
2. Run diagnostics bundle within 15 minutes.  
3. Attach to support ticket with SHA and UTC time.  
4. Do **not** include `.env`, dumps with PII, or MFA secrets.

See [SUPPORT_HANDBOOK.md](./SUPPORT_HANDBOOK.md).
