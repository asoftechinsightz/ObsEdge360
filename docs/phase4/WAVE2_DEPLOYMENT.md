# Phase 4 Wave 2 — Deployment

1. Deploy feature branch via `scripts/vps-deploy-latest.sh` (bundle → SCP → VPS).
2. Migrations run on deploy; gate on `aiops_correlation_members` applies `029_aiops_multisignal_correlation.sql`.
3. Restart observability + api-gateway (handled by deploy script).
4. Validate: `bash /opt/OpsEdge360/scripts/vps-p4-wave2-validate.sh`
5. Expect: `P4_WAVE2_VALIDATION_OK`
