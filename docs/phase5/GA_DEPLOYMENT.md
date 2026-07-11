# Phase 5 — GA Deployment Notes

## Wave 1 deploy

1. Bundle + `scripts/vps-deploy-latest.sh`  
2. Migration gate applies `033_enterprise_ga.sql` when `platform_licenses` missing  
3. Recreate api-gateway + web (+ nginx if 502)  
4. Validate: `bash scripts/vps-p5-wave1-validate.sh` → `P5_WAVE1_VALIDATION_OK`

## Topology guides

- [ENTERPRISE_DEPLOYMENT.md](../architecture/ENTERPRISE_DEPLOYMENT.md) — SaaS / Hybrid / On-Prem  
- [HA.md](../architecture/HA.md)  
- [OPERATIONS_GUIDE.md](../admin/OPERATIONS_GUIDE.md)

## GA claim

Do **not** claim `v1.0.0` until `P5_GA_VALIDATION_OK`.
