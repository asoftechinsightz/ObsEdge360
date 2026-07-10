# ADR-004: Agent Configuration Authentication Model

**Status:** Proposed  
**Date:** 2026-07-10  
**Deciders:** Security Architect, Platform Engineer  
**Phase:** 1  

---

## Context

Discovery already authenticates agent heartbeat/metrics with `X-Agent-Key`. Sprint 0 added config pull/push and update manifest endpoints on the discovery service using the same key. Gateway global `AuthGuard` requires JWT by default. Agents do not have user JWTs.

## Decision

1. Expose agent config/update routes on the gateway as **`@Public()`** (JWT not required).
2. **Forward `X-Agent-Key`** (and related agent headers) unchanged to discovery.
3. Discovery remains the **authorization authority** (key hash verify).
4. Do not accept user JWT as a substitute for agent key on these routes in Phase 1.
5. Platform-initiated config push (tenant admin) may use JWT + discovery admin APIs in a later task if needed; Phase 1 prioritizes agent pull/push parity with discovery service.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Require JWT for agents | Breaks agent-framework; agents are not users |
| mTLS-only | Not ready; cert manager is “ready” not mandated |
| API keys from shared-security | Phase 2 scope |

## Consequences

**Positive:** Compatible with `@opsedge360/agent-framework`.  
**Negative:** Public (unauthenticated JWT) routes — must rely on key secrecy + TLS.  
**Follow-up (Phase 2):** Rate-limit agent endpoints; optional mTLS.

## Compliance

- TLS at Nginx edge remains required in production.
- Never log raw agent keys.
