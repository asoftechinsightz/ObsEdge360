# Phase 5 Wave 2 — Deployment

1. Deploy via `scripts/vps-deploy-latest.sh` (migration 034 applies automatically).
2. Optional HA overlay (operator-enabled, not forced on single-node VPS):
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.ha.yml --profile ha up -d
   ```
3. Helm HA:
   ```bash
   helm upgrade --install opsedge360 ./infra/helm/opsedge360 -f ./infra/helm/opsedge360/values-ha.yaml
   ```
4. Validate: `bash scripts/vps-p5-wave2-validate.sh` → `P5_WAVE2_VALIDATION_OK`

Do not claim GA.
