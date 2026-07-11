# Phase 4 Wave 3 — Validation

**Script:** `scripts/vps-p4-wave3-validate.sh`  
**Token:** `P4_WAVE3_VALIDATION_OK`

Checks:

- Health + migration 030
- Seed rising utilization series
- Predictive EWMA scan (`ewma-v1`)
- Capacity 7d forecast with confidence bands (`capacity-v1`)
- Capacity runs / forecasts / predictions lists
- Legacy `ops_scan` + `trend-v1` still work
- Cross-tenant empty capacity list
