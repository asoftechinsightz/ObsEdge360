# Phase 5 Wave 2 — Validation

**Script:** `scripts/vps-p5-wave2-validate.sh`  
**Token:** `P5_WAVE2_VALIDATION_OK`

Checks migration 034, HA/cluster/replication APIs, failover record, backup verify, upgrade precheck, Helm/Compose artifacts, security (admin-only), honesty (`gaClaim=false`).

Does **not** claim live multi-AZ HA unless `HA_MULTI_NODE=true` on the deployment.
