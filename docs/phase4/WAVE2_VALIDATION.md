# Phase 4 Wave 2 — Validation

**Script:** `scripts/vps-p4-wave2-validate.sh`  
**Token:** `P4_WAVE2_VALIDATION_OK`

Checks:

- Health
- Migration 029 (`aiops_correlation_members`, `aiops_signal_snapshots`, `score` column)
- Signup + multi-signal seed (alert + anomaly + OTLP logs + spans)
- `POST /ai/signals/collect` + shape
- `GET /ai/signals/snapshot`
- `POST /ai/correlate` produces clusters
- `GET /ai/correlations` + `GET /ai/correlations/:id` with multi-type members
- Cross-tenant isolation on correlation detail
