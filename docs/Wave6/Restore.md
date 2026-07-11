# Wave 6 — Restore

## Policy

**Destructive restore is never exposed as a remote API.** Operators run host scripts with change control.

Primary path: `scripts/restore-postgres.sh`

## Certification / attestation

After a restore drill:

1. Validate schema / app health / row-count checks per runbook.
2. `POST /admin/deployment/restore/certify` with `restoreType` (`full|partial|configuration|database|pit`), `sourceArtifact`, `validationReport`, optional `pointInTime`.
3. Review via `GET /admin/deployment/restore/certifications` or UI `/admin/restore-certification`.

## Restore types

| Type | Meaning |
|------|---------|
| full | Full database restore |
| partial | Selected schemas/tables |
| configuration | Config/env restore |
| database | DB-only (exclude object storage) |
| pit | Point-in-time (WAL/PITR when enabled) |

## PITR

Point-in-time recovery depends on PostgreSQL WAL archiving configured on the host. Wave 6 records PIT attestations; enable WAL archive in site-specific ops before claiming PITR readiness.
