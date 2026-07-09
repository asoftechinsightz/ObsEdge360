<!-- Generated Phase 0 — 2026-07-06 — OpsEdge360 -->

# Scalability Review

## Horizontal

Stateless gateway/web/services — Helm HPA documented; prod compose single-replica.

## Event bus

Kafka for SaaS; HTTP fallback for on-prem lite.

## Stateful

PostgreSQL, Redis, Kafka are bottlenecks. Multi-region active-active post-GA per HA runbook.

## Capacity claims

1M+ CIs/tenant — not load-tested in repo.
