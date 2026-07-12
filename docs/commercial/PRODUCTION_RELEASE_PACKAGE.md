# Production Release Package

## What customers receive

A versioned tarball from `scripts/package-commercial.sh` containing:

| Path | Contents |
|------|----------|
| `compose/` | `docker-compose.yml`, `docker-compose.prod.yml`, `docker-compose.ha.yml`, `docker-compose.demo.yml` |
| `helm/opsedge360/` | Helm chart (gateway/web focus) |
| `docs/commercial/` | This commercial pack |
| `docs/pilot/` | Enterprise Pilot Program toolkit |
| `docs/rc3/` | RC3 readiness + security |
| `docs/rc2/` | Pilot ops baseline |
| `docs/Wave9/` | GA admin / ops / API heritage docs |
| `openapi/` | Frozen OpenAPI JSON |
| `sbom/` | Software Bill of Materials |
| `scripts/` | Install, air-gap, backup, restore, upgrade, diagnostics, DR validate |
| `config/env.sample` | Non-secret environment template |
| `MANIFEST.json` | Version, channel, SHA, createdAt |

## Build

```bash
bash scripts/generate-sbom.sh docs/commercial/sbom.json
bash scripts/package-commercial.sh
# → dist/commercial/opsedge360-commercial-<stamp>.tar.gz (+ .sha256)
```

## Supported install paths

1. **Docker Compose (primary)** — single-node and HA overlays  
2. **Helm** — Kubernetes gateway/web (full mesh still Compose-first; disclosed)  
3. **Air-gap** — `airgap-package.sh` / `airgap-verify.sh`  

## Minimum customer prerequisites

- Ubuntu 22.04+ (or equivalent Linux)  
- Docker Engine + Compose v2  
- 8 GB RAM (pilot) / 16 GB+ (production-like)  
- Strong `JWT_SECRET` and `SECRETS_MASTER_KEY`  

## Related validation tokens

| Gate | Token |
|------|-------|
| RC3 EPP | `RC3_EPP_VALIDATION_OK` |
| RC2 Pilot | `RC2_PILOT_VALIDATION_OK` |
| RC1 Market | `P4_RC1_MARKET_VALIDATION_OK` |
