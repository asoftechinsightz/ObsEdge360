# Phase 2 — Performance Impact Assessment

**Document ID:** OE360-P2-PERF-001  
**Status:** PROPOSED  
**Release:** `v0.9.2`  
**Baseline:** `docs/governance/PERFORMANCE_BASELINE.md`  

---

## 1. Changes that affect performance

| Change | Impact type | Expected cost |
|--------|-------------|---------------|
| RBAC/ABAC checks per request | CPU + DB/cache lookup | +1–5 ms p50 if cached; higher if DB each time |
| Tenant filter on queries | DB | Neutral to slight improvement (narrower scans) |
| Audit write on mutations | Sync DB insert | +2–20 ms on mutating paths |
| Security dashboard queries | Read load | Burst on dashboard open |
| Session/BFF cookie path | Extra hop or cookie parse | Small; measure login + API |

## 2. Budgets (Phase 2)

| Endpoint class | p95 budget |
|----------------|------------|
| Health / ready | ≤ 2s (unchanged) |
| Authenticated simple GET | ≤ 1.2s (was 1.0s — +20% AuthZ allowance) |
| Topology GET | ≤ 3s (unchanged) |
| Mutating POST/PUT with audit | ≤ 1.5s |

If budgets cannot be met: cache permission sets in Redis with TTL, or async audit with durable queue (requires ADR addendum).

## 3. Test approach

1. Capture p50/p95 before AuthZ enablement (control).  
2. Enable AuthZ; repeat same script.  
3. Load: modest concurrency (e.g. 20–50 VUs) on health + list endpoints.  
4. Watch Postgres CPU and gateway event-loop lag.  

## 4. Acceptance

- No sustained error-rate increase  
- p95 within budgets or EAB waiver in Risk Register  
- No OOM / restart loops under smoke load  

## 5. Rollback performance note

Disabling AuthZ enforcement flag (if feature-flagged) must restore prior latency profile within one deploy.
