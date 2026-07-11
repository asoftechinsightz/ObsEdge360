# Wave 7 — Load Testing

**Runner:** `scripts/wave7-certify.mjs`  
**Storage:** `load_test_runs`

Profiles executed against the live API plane:

| Profile | Captures |
|---------|----------|
| `sustained` | Throughput, p50/p95/p99, error rate |
| `burst` | Elevated concurrency burst |
| `concurrent_users` | Concurrent-user style load |

Env: `CERT_CONCURRENCY`, `CERT_TOTAL_REQUESTS`, `CERT_FULL_SCALE=true` (1000 / 10000).

Results are measured — not mocked — and appear in the Load / Certification reports.
