# Phase 3 Wave 5 — Deployment

1. Apply migration **026** (gated on `ops_incidents`).
2. Rebuild/restart: **observability**, **api-gateway**, **web** (and event-bus package if rebuilt).
3. Smoke: `GET /api/v1/ops-intelligence/health`.
4. Run `scripts/vps-p3-wave5-validate.sh` → `P3_WAVE5_VALIDATION_OK`.
