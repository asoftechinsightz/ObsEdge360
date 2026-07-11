# Wave 8 — Installation Guide

## Prerequisites

- Docker Engine + Compose plugin (Compose path)
- Kubernetes 1.27+ and Helm 3 (K8s path)
- PostgreSQL 16, Redis, Kafka (bundled in Compose)

## Docker Compose (primary production path)

1. Obtain RC bundle or git tag `v1.0.0-rc1`.
2. Copy `.env` from secure store (never commit secrets).
3. `docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d`
4. Run migrations (`migrate` service / `database/migrations/run.js`).
5. Smoke: `/api/v1/health`, `/ready`, `/live`, web UI login.

## Kubernetes

```bash
kubectl create namespace opsedge360
helm upgrade --install opsedge360 infra/helm/opsedge360 \
  -n opsedge360 -f infra/helm/opsedge360/values-production.yaml
```

## Air-gap

1. Build with `scripts/airgap-package.sh` or include via `scripts/package-rc.sh`.
2. Verify checksum with `scripts/airgap-verify.sh`.
3. Load images into local registry; install offline.

See [UpgradeGuide.md](./UpgradeGuide.md) and [PilotGuide.md](./PilotGuide.md).
