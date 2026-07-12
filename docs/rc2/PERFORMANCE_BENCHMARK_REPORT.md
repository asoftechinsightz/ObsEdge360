# Performance Benchmark Report — RC2

## Methodology

RC2 records **modeled capacity profiles** via `POST /api/v1/performance/benchmarks` using platform concurrency and pool knobs. Live multi-hour soak remains Wave 7 (`CERT_FULL_SCALE`) on staging — do not run destructive load against production peers during pilot demos.

## Profiles

| Concurrent users | Size | API p95 target | Topology guidance |
|------------------|------|----------------|-------------------|
| 100 | Pilot | &lt;150 ms | Compose single or HA |
| 500 | Standard | &lt;250 ms | Compose HA + Redis |
| 1,000 | Growth | &lt;350 ms | HA + DB pooling |
| 5,000 | Enterprise | &lt;450 ms | Kubernetes Helm HPA |
| 10,000 | Large Enterprise | &lt;500 ms | K8s + `PERFORMANCE_PROFILE=high` |

## Measures covered

API latency model, dashboard load estimate, DB latency estimate, queue throughput estimate, browser synthetic timing, Copilot response estimate, memory/CPU guidance.

## How to run

```bash
# After admin login
curl -sk -X POST "$API/performance/benchmarks" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"concurrentUsers":1000}'
```

Results persist in `performance_benchmark_runs`.
