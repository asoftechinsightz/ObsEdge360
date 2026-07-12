# Deployment Validation — RC3

## Clean install checklist

| Step | Command / action | Expect |
|------|------------------|--------|
| Compose config | `docker compose -f docker-compose.prod.yml config` | exit 0 |
| Helm template | `helm template opsedge360 infra/helm/opsedge360` | renders |
| Migrate | `node database/migrations/run.js` | 047 applied |
| Air-gap | `airgap-package.sh` + `airgap-verify.sh` | exit 0 |
| Backup | `backup-postgres.sh` | dump present |
| Upgrade | git fetch + rebuild + migrate | health 200 |
| Rollback | app to RC2 `a2d7e44` or RC1 `ac6c6ba` | keep DB forward |

No undocumented manual steps beyond env secrets (`JWT_SECRET`, `SECRETS_MASTER_KEY`).

Fill evidence dates in ops runbooks when executing on customer hardware.
