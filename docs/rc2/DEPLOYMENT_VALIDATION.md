# Deployment Validation — RC2

| Mode | Artifact | Validation |
|------|----------|------------|
| Docker Compose prod | `docker-compose.yml` + `docker-compose.prod.yml` | VPS deploy script |
| HA | `docker-compose.ha.yml` | Present |
| Helm | `infra/helm/opsedge360` | Chart present |
| Air-gap | `scripts/airgap-package.sh` | Present |
| Offline | air-gap verify + docs | Documented |
| Backup / Restore | `scripts/backup-postgres.sh` + Wave6 UI | Documented |
| Upgrade / Rollback | `docs/rc2/ROLLBACK_PLAN.md` | Documented |

Clean-environment pilot install: follow `PILOT_INSTALLATION_GUIDE.md`.
