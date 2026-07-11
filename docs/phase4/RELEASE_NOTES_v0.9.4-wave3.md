# Release Notes — v0.9.4-wave3

**Phase 4 Wave 3 — Predictive anomaly + capacity forecasting**

## Highlights

- EWMA residual-band anomalies and leading capacity-breach predictions (`ewma-v1`)
- Sample-driven 7-day capacity forecasts with confidence intervals (`capacity-v1`)
- Breach ETA → `incident_predictions` + anomaly records
- Legacy `ops_scan` / `trend-v1` paths unchanged

## Ops

- Tag: `v0.9.4-wave3`
- Validation token: `P4_WAVE3_VALIDATION_OK`
- Migration: `030_predictive_anomaly_capacity.sql`
