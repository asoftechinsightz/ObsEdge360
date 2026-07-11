# Phase 4 Wave 4 — Deployment

1. Deploy via `scripts/vps-deploy-latest.sh`.
2. Migration gate on `remediation_action_catalog` applies `031_controlled_remediation.sql`.
3. After gateway recreate, recreate nginx if upstream 502.
4. Validate: `bash /opt/OpsEdge360/scripts/vps-p4-wave4-validate.sh`
5. Expect: `P4_WAVE4_VALIDATION_OK`
