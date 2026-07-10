# Performance Baseline

**Document ID:** OE360-PERF-BASE-001  
**Version:** 1.0  
**Status:** FROZEN (targets; evidence collected at PRR)  
**Effective:** 2026-07-10  

Minimum performance expectations for Phase 1+ releases on the reference VPS/staging profile. Record actuals in the phase PRR; do not silently lower targets without EAB approval.

---

## 1. Reference environment

| Attribute | Assumption |
|-----------|------------|
| Topology | Docker Compose production stack |
| Entry | Nginx → web / api-gateway |
| DB | PostgreSQL `trinetra360` |
| Load profile | Light enterprise ops (single-tenant smoke + modest concurrency) |

Exact VPS sizing is recorded during PRR (CPU/RAM/disk).

---

## 2. API latency targets (p95)

| Endpoint class | p95 target | Notes |
|----------------|------------|-------|
| `GET /api/v1/health` | ≤ 2s | Includes dependency probe budget |
| Simple authenticated list (e.g. CMDB CIs page) | ≤ 1s | Warm DB |
| Topology read | ≤ 3s | May be heavier |
| Pipeline source list | ≤ 1s | |
| Auth login | ≤ 2s | |

p50 should be comfortably under p95. Failures/timeouts count toward error rate, not latency success.

---

## 3. Web targets

| Metric | Target |
|--------|--------|
| Landing / login TTFB (approx) | ≤ 2s p95 over HTTPS |
| Cold compose ready (all healthy) | Recorded at PRR; aim ≤ 5 min on reference host |

---

## 4. Resource targets

| Resource | Target |
|----------|--------|
| CPU | Sustained < 70% under smoke load; headroom for bursts |
| Memory | No OOM kills during PRR window; stable RSS after warmup |
| Disk | ≥ 20% free; logs not unbounded without rotation |

---

## 5. Reliability under load (smoke)

| Check | Target |
|-------|--------|
| Error rate on health/smoke suite | 0% for critical paths |
| Restart recovery | Services return healthy without manual DB repair |
| No restart loops | ≥ 15 min observation |

---

## 6. Measurement method

1. Prefer staging identical to prod compose.  
2. Capture p50/p95 with a simple script or gateway access logs.  
3. Record commit SHA, time, and host in PRR.  
4. Waivers go to Risk Register + EAB.

---

## 7. Evolution

Phase 3+ may tighten targets and add soak/load tests. Changes to this baseline require a new version (`v1.1+`) or ADR — do not silently edit v1.0 numbers after freeze without version bump.

## Related

- `docs/reviews/PHASE1_PRODUCTION_READINESS_REVIEW.md`  
- `RELEASE_CHECKLIST.md` · `DEFINITION_OF_DONE.md`  
