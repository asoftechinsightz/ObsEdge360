# Phase 5 Wave 5 — Deployment

1. Deploy via `scripts/vps-deploy-latest.sh`
2. Migration `037_enterprise_integrations.sql` applies when `connector_instances` missing
3. Recreate api-gateway (+ web)
4. Validate: `bash scripts/vps-p5-wave5-validate.sh` → `P5_WAVE5_VALIDATION_OK`

Do not claim GA. Do not tag until validation passes.
