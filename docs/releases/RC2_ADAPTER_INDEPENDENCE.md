# RC2 — Adapter Independence & Vendor Neutrality Gate

**Date:** 2026-07-13  
**Status:** REQUIRED before RC2 freeze / Sprint 3 authorization

## Adapter Independence

Customer path (invariant):

```text
OpsEdge360 UI  →  /api/v1/observe contracts  →  ObserveAdapter SPI  →  Engine adapter
```

Proven engine slots (same SPI, identical customer DTOs):

| Internal adapter | `OBSERVE_ENGINE` | Customer displayName |
|------------------|------------------|----------------------|
| Native pipeline | `native` (default) | Unified Observability |
| Engine connector A | `demo` / `skywalking` | Unified Observability |
| OpenObserve-shaped | `openobserve` | Unified Observability |
| Datadog API-shaped | `datadog` | Unified Observability |

**Proof:** unit suite `observe.adapter-independence.test.ts`  
Swapping `OBSERVE_ENGINE` does **not** require UI, navigation, public DTO, or screen rewrites.

`GET /api/v1/observe/runtime` returns only OpsEdge-safe metadata (`brand`, `label`, `capabilities`, `swappable`) — never engine product names or adapter ids.

## Vendor Neutrality Audit

| Surface | Rule | Result |
|---------|------|--------|
| Frontend observe pages | No vendor product names | PASS (OTLP empty-state copy removed) |
| ObserveSubnav / nav-config | OpsEdge module labels only | PASS |
| Public DTOs (`observe.types`) | Domain language only | PASS |
| `/observe/*` responses | brand=OpsEdge360; no engine marks | PASS (prod RC2 + unit) |
| DB seed attributes | May tag `demo:sprint2` internally | OK (not rendered as vendor) |
| Adapter class names / env | Internal only | OK |

Allowed customer vocabulary examples: Application, Business Service, Infrastructure, Trace, Metric, Log, Incident, Topology, Kubernetes, Container, Database.

Forbidden in customer UX: SkyWalking, Grafana, Datadog, OpenObserve, Elastic APM, New Relic, Prometheus UI, etc.

## Implication

OpsEdge360 presents as an **Enterprise Digital Operations Intelligence Platform**. Observability engines are replaceable implementation details behind ObserveAdapter.
