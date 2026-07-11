# Wave 8 — Upgrade Guide

## Supported upgrade path

**From:** `v1.0.0-wave7` (SHA `bc3ceeb958a0defa3118b44dcbf034b999f9ec49`)  
**To:** `v1.0.0-rc1`

Migration `040_wave8_release_candidate.sql` is **additive** — no Wave 1–7 table drops/renames.

## Procedure

1. Backup PostgreSQL (`scripts/backup-postgres.sh`) and `.env`.
2. Deploy RC via `scripts/vps-deploy-latest.sh` with `DEPLOY_BRANCH=feature/wave8-release-candidate` or tag checkout.
3. Confirm migrate applies 040.
4. Smoke health + Admin + Certification Center + Release Candidate overview.
5. Record attestation: `POST /admin/system/release-candidate/install/attest` with `installType=upgrade`.

## Data loss

None expected for additive 040. Do not restore Wave 7 DB over RC unless rolling back the entire release.
