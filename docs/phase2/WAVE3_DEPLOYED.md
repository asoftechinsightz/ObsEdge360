# Wave 3 — Deployed (Production)

**Document ID:** OE360-WAVE3-DEPLOY-001  
**Status:** ✅ **DEPLOYED & VALIDATED**  
**Production commit:** `3ee904c`  
**Validated:** 2026-07-11  
**Environment:** VPS `api.observability360.asoftechinsightz.com`  

## Decision package

| Item | Status |
|------|--------|
| SDS-2.3 | Accepted with Conditions (incorporated) |
| Dual-layer async pipeline | ✅ Live |
| Migration 017 | ✅ Applied |
| Production validation | ✅ `WAVE3_VALIDATION_OK` (17/17) |

## Validation evidence

| Check | Result |
|-------|--------|
| health / ready | 200 |
| `audit_evidence` / outbox tables | present |
| retention defaults | 4 global rows |
| Cross-tenant spoof | 403 |
| Audit health | 200 |
| Ingest (queued=true) | 201 |
| Search L1 | 200 |
| L2 evidence written | yes |
| Integrity verify | ok=true |
| Evidence export / retention list | 200 |
| AUTHZ_ENFORCE | true |

## Pipeline confirmed

```text
Ingest/deny → L1 audit_logs → outbox → Evidence Writer → audit_evidence (hash verified)
```

## Next

EAB Wave 3 review → tag `v0.9.2-wave3` if approved → Wave 4 SDS (Secrets) only after acceptance.
