# Sprint 1 RC1 — Performance Report

**Document ID:** OE360-S1-RC1-PERF  
**Date:** 2026-07-13  
**Build:** `e065f56`  
**Method:** 5-sample `perf_counter` timings from VPS against production HTTPS APIs (`scripts/vps-s1-rc1-perf.py`)

---

## Targets vs actual

| Metric | Target | Actual (p50 / avg) | Gate |
|--------|--------|--------------------|------|
| Dashboard API `/dashboard/executive` | &lt; 300 ms typical · dashboard &lt; 2s | **13.0 ms / 33.7 ms** | **PASS** |
| Search `/search?q=payment` | &lt; 2s | **19.5 ms / 22.2 ms** | **PASS** |
| Twin `/twin/graph?limit=80` | &lt; 2s interactive | **20.7 ms / 23.3 ms** | **PASS** |
| Health | — | **12.1 ms avg** | PASS |
| Ready | — | **5.7 ms avg** | PASS |
| Web `/` | — | **12.3 ms avg** | PASS |
| Web `/login` | — | **9.4 ms avg** | PASS |

### Dashboard API detail

| Stat | ms |
|------|-----|
| min | 12.1 |
| p50 | 13.0 |
| max | 111.7 (cold/cache miss outlier) |
| avg | 33.7 |

Max &lt; 300 ms target for typical API. Well under 2s dashboard budget (API portion).

---

## Capacity note

Architecture targets (10k entities / 1k users) remain design goals. This RC1 measures **Sprint 1 demo estate** (~3.3k assets, 54 twin nodes) under production deployment — not a full load test.

Load/soak certification remains Sprint 10 / v2.0.

---

## Performance gate: PASS
