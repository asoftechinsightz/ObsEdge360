# Deployment Guide — RC1

## Options

| Mode | Path |
|------|------|
| Docker Compose prod | `docker-compose.yml` + `docker-compose.prod.yml` |
| HA overlay | `docker-compose.ha.yml` + Redis sentinel |
| Helm | `infra/helm/opsedge360` (Chart 1.0.0) |
| Air-gap | `scripts/airgap-package.sh` / `airgap-verify.sh` |
| Demo plane | `docker-compose.demo.yml` + `.env.demo.example` |

## Production deploy (VPS pattern)

1. `git bundle create … feature/phase4-rc1-market-readiness`
2. SCP bundle → VPS
3. `DEPLOY_BRANCH=feature/phase4-rc1-market-readiness bash scripts/vps-deploy-latest.sh`
4. Confirm migration 044
5. `bash scripts/vps-p4-rc1-validate.sh`

## Backup / restore

Use `scripts/backup-postgres.sh` and Wave 6 backup/restore certification UIs. Keep `.env` backups outside the repo.
