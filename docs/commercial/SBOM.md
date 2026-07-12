# Software Bill of Materials (SBOM)

## Generate

```bash
bash scripts/generate-sbom.sh docs/commercial/sbom.json
```

Also written into commercial tarball under `sbom/sbom.json`.

## Format

OpsEdge360 ships a **lite SBOM** enumerating workspace packages and apps (and services when present). CI may also produce SPDX via `anchore/sbom-action` (see `.github/workflows/ci-cd.yml`).

## Procurement use

Attach `sbom.json` + release SHA + known issues to customer security questionnaires.

## Regenerating after dependency changes

Re-run generate-sbom before each commercial drop; commit or attach the artifact with the tarball checksum.
