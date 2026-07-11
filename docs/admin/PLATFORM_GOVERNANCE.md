# Platform Governance

Wave 3 admin governance for OpsEdge360 (`v1.0.0-wave3`).

## Quotas

Soft/hard limits per resource via `/api/v1/admin/quotas`. Warnings at `warnPct` (default 80%). Hard breaches return Forbidden on guarded paths.

## Settings

Groups: `general`, `platform`, `ai`, `notifications` via `PUT /api/v1/admin/settings/:group`.

## License

Non-disruptive enforcement: expired licenses warn and block new entitlement issuance; existing workloads continue.

## Audit

Governance actions stored in `governance_audit_events` and listed at `/api/v1/admin/governance/audit`.
