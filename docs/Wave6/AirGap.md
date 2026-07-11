# Wave 6 — Air-Gapped Deployment

## Goals

- No internet dependency at install/upgrade time (after package transfer)
- Offline installation package
- Local image registry support
- Offline documentation embedded in package
- Dependency / checksum verification

## Build package

```bash
./scripts/airgap-package.sh ./dist/airgap
```

Produces:

- `opsedge360-airgap-<stamp>.tar.gz`
- `opsedge360-airgap-<stamp>.tar.gz.sha256`
- Contents: Helm chart, compose files, Wave6 docs, backup/restore scripts, optional `docker save` images

## Verify

```bash
./scripts/airgap-verify.sh ./dist/airgap/opsedge360-airgap-*.tar.gz
# → AIRGAP_VERIFY_OK
```

## Control plane registration

1. `POST /admin/deployment/airgap` with `packageName`, `version`, `checksumSha256`, manifest.
2. `POST /admin/deployment/airgap/:id/verify` with computed checksum.
3. UI: `/admin/deployment`

## Limitations (honest)

- Package build skips missing local images; full offline install requires gateway/web images saved beforehand.
- Private registry push/pull is an operator step outside the API.
- VPS production today uses Compose; air-gap Helm path is for on-prem Kubernetes sites.
