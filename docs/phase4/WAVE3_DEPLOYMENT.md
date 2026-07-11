# Phase 4 Wave 3 — Deployment

1. Deploy via `scripts/vps-deploy-latest.sh`.
2. Migration gate on `capacity_forecast_runs` applies `030_predictive_anomaly_capacity.sql`.
3. Validate: `bash /opt/OpsEdge360/scripts/vps-p4-wave3-validate.sh`
4. Expect: `P4_WAVE3_VALIDATION_OK`
