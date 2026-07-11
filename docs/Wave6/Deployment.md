# Wave 6 — Deployment

**Release:** `v1.0.0-wave6`  
**Compose path (current production):** Docker Compose + Nginx on VPS  
**Kubernetes path:** Helm chart `infra/helm/opsedge360`

## Production VPS (compose)

1. Create git bundle of the release branch.
2. SCP to `/tmp/opsedge360-latest.bundle`.
3. Run `scripts/vps-deploy-latest.sh` (supports `DEPLOY_BRANCH`, default `feature/sprint0-enterprise-foundation`).
4. Migration runner applies `038_wave6_enterprise_deployment.sql` when `secret_rotation_jobs` is absent.
5. Smoke: `/api/v1/health`, `/ready`, `/live`, web root.

## Deployment profiles (API)

- `POST /admin/deployment/profiles` — register mode/namespace/helm release/values snapshot.
- `GET /admin/deployment/profiles` — list + Helm feature matrix.

## Offline upgrade

1. Build air-gap package (`scripts/airgap-package.sh`).
2. Transfer archive + `.sha256` to site.
3. Verify (`scripts/airgap-verify.sh`).
4. Load images into local registry; `helm upgrade` or compose rebuild from package contents.
5. Run migrations; re-smoke health endpoints.

## Environment flags (Wave 6)

| Variable | Purpose |
|----------|---------|
| `SECRETS_ROTATION_SCHEDULER` | `false` disables expiry/rotation tick |
| `SECRETS_ROTATION_INTERVAL_MS` | Scheduler interval (default 300000) |
| `SECRETS_AUTO_ROTATE` | Must be `true` for automatic rotation |
| `DEPLOY_BRANCH` | Bundle ref fetched by `vps-deploy-latest.sh` |
