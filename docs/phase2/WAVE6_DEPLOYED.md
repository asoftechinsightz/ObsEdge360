# Wave 6 — Deployed (Production)

**Document ID:** OE360-WAVE6-DEPLOY-001  
**Status:** ✅ **DEPLOYED & VALIDATED**  
**Production commit:** `4b921d6`  
**Validated:** 2026-07-11  
**Tag:** `v0.9.2-wave6`

## Scope (EAB)

Enterprise Security Observability — unified security event pipeline, detection rules, alerts, dashboard, Prometheus security metrics, migration **020**.

## Validation

**WAVE6_VALIDATION_OK** — 14/14 PASS

| Check | Result |
|-------|--------|
| Health | 200 |
| Migration 020 | ✅ |
| Default detection rules | 3 |
| Obs health | 200 |
| Event ingest | 201 |
| Event search | 200 |
| Dashboard | 200 |
| Rules list | 200 |
| Alerts list | 200 |
| Cross-tenant AuthZ still 403 | ✅ |
| Prometheus security counters | ✅ |
| Cross-tenant event isolation | ✅ |

## Next

EAB Wave 6 closure → Wave 7 mTLS / SPIFFE progression (when approved).
