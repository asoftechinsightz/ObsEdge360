# SDS-4.3 — Predictive Anomaly + Capacity Forecasting

**Document ID:** OE360-SDS-4.3  
**Wave:** Phase 4 / Wave 3  
**Release:** `v0.9.4`  
**Status:** ✅ APPROVED FOR IMPLEMENTATION  
**Depends on:** Wave 2 closed (`v0.9.4-wave2`)

## Objectives

1. **Predictive anomalies** — EWMA / residual-band detection plus leading breach forecasts (not only retrospective σ).
2. **Capacity forecasting** — 7-day (BR-AI-03) sample-driven forecasts with confidence intervals and breach ETA.
3. Persist honest `model_version` labels (`ewma-v1`, `capacity-v1`); keep `ops_scan` / `trend-v1` paths intact.
4. Optional `incident_predictions` when capacity breach ETA is within horizon.

## Non-goals

- Controlled live remediation (Wave 4.4)
- Full knowledge graph (Wave 4.5)
- Replacing analytics heuristic façade in this wave (optional later wiring)

## Migration

**030** — extend `anomalies`, `predictive_forecasts`, `metric_baselines`; add `capacity_forecast_runs`.

## APIs (additive)

- `POST /ops-intelligence/predictive/scan`
- `POST /ops-intelligence/capacity/forecast`
- `GET /ops-intelligence/capacity/runs`
- `GET /ops-intelligence/predictions`
- Existing scan / trend generate remain backward compatible

## Acceptance

**P4_WAVE3_VALIDATION_OK** in production.
