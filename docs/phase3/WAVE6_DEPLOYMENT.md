# Phase 3 Wave 6 — Deployment

1. Apply migration **027** (gated on `ops_dashboards`).
2. Rebuild: observability, api-gateway, web.
3. Smoke: `GET /api/v1/dashboards/catalog`.
4. Run `scripts/vps-p3-wave6-validate.sh` → `P3_WAVE6_VALIDATION_OK`.
