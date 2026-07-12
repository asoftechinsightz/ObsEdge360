# Pilot Deployment Package

## Contents

| Component | Location |
|-----------|----------|
| Compose prod / HA / demo | `docker-compose.prod.yml`, `docker-compose.ha.yml`, `docker-compose.demo.yml` |
| Helm chart (gateway/web) | `infra/helm/opsedge360/` |
| Migrations | `database/migrations/` (through 047) |
| Air-gap scripts | `scripts/airgap-package.sh`, `scripts/airgap-verify.sh` |
| Backup / restore | `scripts/backup-postgres.sh`, `scripts/restore-postgres.sh` |
| Upgrade | `scripts/upgrade-onprem.sh` |
| RC2 pilot ops | `docs/rc2/` |
| EPP toolkit | `docs/pilot/` |
| RC3 readiness | `docs/rc3/` |
| Validate | `scripts/vps-rc3-validate.sh` |

## Build customer drop

```bash
# Prefer GA/RC packagers; ensure docs/pilot + docs/rc3 + docs/rc2 are included
bash scripts/package-rc.sh
bash scripts/airgap-package.sh   # offline
```

## Minimum host

- Ubuntu 22.04+ (or equivalent)
- Docker Engine + Compose v2
- 8 GB RAM (pilot), 16 GB+ recommended
- Strong `JWT_SECRET` and `SECRETS_MASTER_KEY` (base64 32-byte preferred)

## Do not ship

- Lab MFA flag enabled (`OPS_MFA_LAB_CODES`)
- Dev JWT secrets
- Customer production data in demo plane
