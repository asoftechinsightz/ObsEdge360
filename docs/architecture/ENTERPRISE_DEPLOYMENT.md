# Enterprise Deployment Architecture

**Phase:** 5 — Enterprise GA  
**Status:** Wave 1 baseline (expand through Waves 2 & 8)

## Deployment modes

| Mode | Env | Notes |
|------|-----|-------|
| SaaS | `DEPLOYMENT_MODE=saas` | Multi-tenant control plane; horizontal scale of gateway/web; rolling upgrades |
| Hybrid | `DEPLOYMENT_MODE=hybrid` | Control plane cloud; agents/data plane customer-side with outbound mTLS |
| On-Prem | `DEPLOYMENT_MODE=onprem` | Compose or Helm; offline/air-gap via image/bundle transfer |

Public config: `GET /api/v1/platform/config`.

## On-Premises

- Docker Compose: `docker-compose.yml` + `docker-compose.prod.yml`  
- Helm: `infra/helm/opsedge360` (single-replica Wave 1 chart)  
- Upgrade: `scripts/upgrade-onprem.sh`  
- Backup/Restore: `scripts/backup-postgres.sh`, `scripts/restore-postgres.sh`

## Hybrid

- Universal Agent fleet (Phase 3) with outbound-only connectivity  
- Existing mTLS / SPIFFE mesh foundations (Phase 2)  
- Proxy/VPN: operator network path; document in site runbooks

## SaaS

- Multi-tenant JWT + AuthZ (Phase 2)  
- Rolling deploy via recreate + nginx upstream refresh  
- Blue/Green and autoscaling: Wave 2+ / Wave 8 packaging

## Honesty

Wave 1 does not claim multi-AZ HA or air-gap installer completeness. Those are later waves before `P5_GA_VALIDATION_OK`.
