<!-- Generated Phase 0 — 2026-07-06 — OpsEdge360 -->

# Performance Review

## NFR targets

- p95 API <200ms read / <500ms write
- Dashboard <3s
- 100K events/sec telemetry

## Current

- Gateway proxy timeout 5s
- Connection pools by PERFORMANCE_PROFILE
- Redis/in-memory cache on executive paths
- OTLP in PostgreSQL — bottleneck at scale

## VPS experience

Dashboard was slow when microservices crashed (fixed via Dockerfile CMD). Now loads fast with healthy services.
