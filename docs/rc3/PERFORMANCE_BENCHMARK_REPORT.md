# Performance Benchmark Report — RC3

RC3 does **not** re-claim live 5k/10k soak. Guidance remains:

| Segment | Users | Topology | Evidence |
|---------|-------|----------|----------|
| Small enterprise | ≤100 | Compose | Modeled RC2 + Wave7 smoke |
| Medium | ≤1,000 | Compose HA | Wave7 certify |
| Large | 5k–10k | K8s HPA | Wave7 `CERT_FULL_SCALE` on staging |

Links: `docs/Wave7/LoadTesting.md`, `docs/rc2/PERFORMANCE_BENCHMARK_REPORT.md`.

Modeled profiles still available: `POST /performance/benchmarks`.
