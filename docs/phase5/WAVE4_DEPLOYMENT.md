# Phase 5 Wave 4 — Deployment

1. Deploy via `scripts/vps-deploy-latest.sh`
2. Migration `036_controlled_automation.sql` applies when `automation_workflows` missing
3. Recreate api-gateway (+ web)
4. Validate: `bash scripts/vps-p5-wave4-validate.sh` → `P5_WAVE4_VALIDATION_OK`

**Production:** applied 2026-07-11 · tip `85b9e8fc` · validation 22/22 green.

Do not claim GA.
