# Release Notes — v0.9.3-wave2

**Production SHA:** `57923b5`  
**Date:** 2026-07-11

Universal Agent foundation: secure enrollment, fleet control plane, durable offline queue, plugin collectors, OTLP upload, Fleet UI, migration **023**. Validated (`P3_WAVE2_VALIDATION_OK`, 15/15).

## Known limitations

- Auto-update: check/verify/rollback interfaces only — no package distribution CDN yet  
- Deep journald / Windows Event Log shipping is sampled via builtin plugin (full shippers extend via plugins)  
- Platform extensions (Docker/K8s/cloud) are detect/register interfaces ready for collectors  
- External SPIRE agent identity binding remains optional (mTLS material supported when paths set)
