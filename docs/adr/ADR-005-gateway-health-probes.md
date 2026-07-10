# ADR-005: API Gateway Health Dependency Probes

**Status:** Proposed  
**Date:** 2026-07-10  
**Deciders:** SRE Lead, Staff Engineer  
**Phase:** 1  

---

## Context

`GET /api/v1/health` currently returns a **static** map of services as `"up"`, which misleads load balancers and operators. True failures in discovery/cmdb/etc. are invisible at the edge.

## Decision

1. Implement **active probes** from gateway to configured backend base URLs (`DISCOVERY_URL`, `CMDB_URL`, …) hitting each service `/health`.
2. Use short timeouts (e.g., 1–2s) and parallel requests.
3. Response shape remains JSON with `status: healthy | degraded | unhealthy` and per-service `up|down`.
4. HTTP status: `200` when gateway process is up even if degraded (so Nginx doesn’t flap on partial outage); optionally `503` only if gateway cannot function (configurable via env `HEALTH_FAIL_ON_DEGRADED=false` default).
5. Do not probe scheduler/config-mgmt unless ADR-003 Option A is selected.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Keep static healthy | Unsafe for production ops |
| 503 on any dependency down | Causes full site outage for partial failure |
| Only process liveness | Insufficient for SRE |

## Consequences

**Positive:** Honest health; faster incident detection.  
**Negative:** Slight probe overhead; need careful timeouts.  

## Compliance

- No change to public domain routing.
- Document probe list in deployment guide delta.
