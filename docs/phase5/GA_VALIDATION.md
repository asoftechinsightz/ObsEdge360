# Phase 5 — GA Validation

## Phase exit (all waves)

**Token:** `P5_GA_VALIDATION_OK`  
Required: HA, backup/restore, upgrade, SaaS/Hybrid/On-Prem drills, security + performance gates, docs freeze.

## Wave 1

**Script:** `scripts/vps-p5-wave1-validate.sh`  
**Token:** `P5_WAVE1_VALIDATION_OK`

Checks: migration 033, admin overview/licenses/policies/runbooks/integrations/backups, production policy rejection without approval, cross-tenant isolation, health.
