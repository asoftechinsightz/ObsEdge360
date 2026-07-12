# Deployment Validation — RC2

**Purpose:** Operator checklist with commands and expected outcomes. Artifact presence alone is insufficient for customer claims — execute and record results per environment.

## Artifacts

| Item | Path | Expect |
|------|------|--------|
| Compose prod | `docker-compose.prod.yml` | Present |
| Compose HA | `docker-compose.ha.yml` | Present |
| Compose demo | `docker-compose.demo.yml` | Present |
| Helm chart | `infra/helm/opsedge360/Chart.yaml` | Present (gateway/web focus) |
| Air-gap package | `scripts/airgap-package.sh` | Present |
| Air-gap verify | `scripts/airgap-verify.sh` | Present |
| Postgres backup/restore | `scripts/backup-postgres.sh`, `scripts/restore-postgres.sh` | Present |
| Upgrade | `scripts/upgrade-onprem.sh` | Present |
| RC2 validate | `scripts/vps-rc2-validate.sh` | Present |

## Compose dry-run

```bash
docker compose -f docker-compose.prod.yml config >/dev/null && echo OK_compose_prod
docker compose -f docker-compose.ha.yml config >/dev/null && echo OK_compose_ha
```

**Expect:** exit 0, `OK_compose_*`.

## Helm dry-run

```bash
helm template opsedge360 infra/helm/opsedge360 -f infra/helm/opsedge360/values.yaml >/tmp/oe360-helm.yaml
# Optional HA values:
helm template opsedge360 infra/helm/opsedge360 -f infra/helm/opsedge360/values-ha.yaml >/dev/null
```

**Expect:** templates render without error. Note: chart does not replace full Compose microservice set.

## Backup / restore

```bash
bash scripts/backup-postgres.sh
# Inspect dump path printed by script
# Restore only on disposable DB:
# bash scripts/restore-postgres.sh <dump>
```

**Expect:** dump file created; restore tested on non-prod clone before pilot cutover.

## Air-gap

```bash
bash scripts/airgap-package.sh
bash scripts/airgap-verify.sh
```

**Expect:** package + verify scripts exit 0; images/docs included per script output.

## Upgrade / rollback

```bash
# Upgrade path
bash scripts/upgrade-onprem.sh   # or manual git fetch + compose rebuild + migrate

# Rollback app to RC1 (keep DB migrations forward)
git checkout ac6c6ba58ef72b16e24d93a4be30215795577c97
docker compose -f docker-compose.prod.yml up -d --build
```

See [ROLLBACK_PLAN.md](./ROLLBACK_PLAN.md).

## Clean-environment evidence log

| Check | Date | Operator | Result | Notes |
|-------|------|----------|--------|-------|
| Compose config | | | | |
| Helm template | | | | |
| Backup script | | | | |
| Air-gap package/verify | | | | |
| `vps-rc2-validate.sh` | | | | Attach pass/fail counts |

Fill this table when running validation on the target host; mirror summary into [RC2_VALIDATION.md](./RC2_VALIDATION.md).
