# Phase 4 Wave 3 — Implementation

See [SDS-4.3-PredictiveCapacity.md](./sds/SDS-4.3-PredictiveCapacity.md).

- Engine: `services/observability/src/predictive-forecast.service.ts`
- Routes: `/ops-intelligence/predictive/scan`, `/capacity/forecast`, `/capacity/runs`, `/capacity/forecasts`, `/predictions`
- Gateway: `apps/api-gateway/src/ops-intelligence.controller.ts`
- Correlation: forecast signals in `correlation-engine.service.ts`
- UI: `/ops-intelligence` — Predictive scan + Capacity 7d
- Migration: `030_predictive_anomaly_capacity.sql`
- Models: `ewma-v1`, `capacity-v1` (legacy `ops_scan` / `trend-v1` preserved)
