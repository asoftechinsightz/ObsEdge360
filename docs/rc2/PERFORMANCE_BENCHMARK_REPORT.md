# Performance Benchmark Report — RC2

**Important:** Tables below are **capacity guidance** from modeled profiles (`mode: modeled-capacity`). They are **not** live soak measurements of a 5k/10k concurrent-user production run.

Live measured soak and certification remain under Wave 7:

- [docs/Wave7/LoadTesting.md](../Wave7/LoadTesting.md)  
- [docs/Wave7/Validation.md](../Wave7/Validation.md)  
- Runner: `scripts/wave7-certify.mjs` (`CERT_FULL_SCALE` for large concurrency)

## Guidance profiles (RC2 modeled API)

| Concurrent users | Segment | API p95 guidance | Dashboard guidance | Topology guidance |
|------------------|---------|------------------|--------------------|-------------------|
| 100 | Pilot | < 150 ms | < 500 ms | Compose single/HA |
| 500 | Standard | < 250 ms | < 900 ms | Compose HA + Redis |
| 1,000 | Growth | < 350 ms | < 1.2 s | HA + DB pooling |
| 5,000 | Enterprise | < 450 ms | < 1.8 s | K8s Helm HPA |
| 10,000 | Large enterprise | < 500 ms | < 2.0 s | K8s + `PERFORMANCE_PROFILE=high` |

Targets used by the model: API p95 500 ms, dashboard 2000 ms, DB 200 ms.

## How to record modeled runs

```bash
curl -sk -X POST "$API/performance/benchmarks" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"concurrentUsers":1000}'
```

Or use `/rc2` UI bench buttons. Results persist in `performance_benchmark_runs`.

## What RC2 does / does not claim

| Claim | Status |
|-------|--------|
| Customer-facing capacity storytelling for architecture reviews | Yes (modeled + Wave7 link) |
| RC2-certified 5k/10k live soak | No — run Wave7 `CERT_FULL_SCALE` on staging |
| Continuous k6 CI | Not in RC2 scope |

## Optional smoke note

If a Wave7 smoke sample is captured on the pilot VPS, attach p95/latency numbers here as an appendix without re-labeling them as full-scale CERT.
