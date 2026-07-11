# Wave 8 — Operations Guide

## Backup & restore

- Backup: `scripts/backup-postgres.sh` + `scripts/backup-certify.sh`
- Restore: host-side `scripts/restore-postgres.sh` only; attest via Wave 6 APIs
- Details: `docs/Wave6/Backup.md`, `docs/Wave6/Restore.md`

## HA / chaos

- Controlled drills: `scripts/wave7-chaos-ha.sh`
- Certification: `docs/Wave7/`

## Packaging refresh

`scripts/package-rc.sh` produces Compose + Helm + docs + OpenAPI archive for customer delivery.
