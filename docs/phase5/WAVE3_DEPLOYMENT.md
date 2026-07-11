# Phase 5 Wave 3 — Deployment

1. Deploy via `scripts/vps-deploy-latest.sh`
2. Migration `035_platform_governance.sql` applies when `platform_quotas` missing
3. Recreate api-gateway (+ web)
4. Validate: `bash scripts/vps-p5-wave3-validate.sh` → `P5_WAVE3_VALIDATION_OK`

**Production:** applied 2026-07-11 · tip `9e1eade5` · validation 22/22 green.

Do not claim GA.
