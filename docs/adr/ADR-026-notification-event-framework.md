# ADR-026: Notification & Event Framework

**Decision Status:** Proposed  
**Date:** 2026-07-11  
**Deciders:** EAB (pending)  
**Phase / Release:** Before Phase 3 / `v0.9.3` Observability  
**Depends on:** ADR-009, event-bus patterns  

---

## Business Context

Operators need reliable notifications (email, webhook, in-app) for security alerts, incidents, and compliance events without hardcoding channels into each service.

## Problem Statement

Alerting is incomplete; no unified notification/event framework for multi-channel delivery with tenant isolation.

## Decision (proposed)

1. Notification & Event Framework as a **platform module**: event → rule → channel → delivery.  
2. Sources: security events, observability alerts, compliance results.  
3. Channels pluggable (email, webhook, Slack later).  
4. Tenant-scoped; RBAC for subscription management.  
5. Never couple channel SDKs into core gateway — adapters as plugins.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| Per-service email sends | Sprawl |
| External-only PagerDuty | Weak product control |

## Consequences

**Positive:** Consistent alerting. **Negative:** Delivery reliability/ops.

## Security Impact

Webhooks need SSRF controls; secrets for channel creds via ADR-014.

## Performance Impact

Async delivery; do not block request path.

## Scalability Impact

Queue-backed workers.

## Compliance Impact

Supports incident notification evidence.

## Rollback Strategy

Disable dispatcher; events retained.

## Future Considerations

On-call schedules, digest mode, customer-facing status pages.

## Decision Status

**Proposed** — finalize before Phase 3 coding.  
