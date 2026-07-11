# Phase 3 Wave 4 — Deployment

1. Apply migration **025** via `node database/migrations/run.js` (gated on `inferred_dependencies`).
2. Rebuild/restart: **cmdb**, **api-gateway**, **web**.
3. Smoke: `GET /api/v1/cmdb/topology/layers`, `POST /api/v1/cmdb/topology/sync-traces`.
4. Run `scripts/vps-p3-wave4-validate.sh` → expect `P3_WAVE4_VALIDATION_OK`.
