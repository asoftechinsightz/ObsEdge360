# Wave 6 — Security

**SDS:** `docs/phase5/sds/SDS-5.6-EnterpriseDeploymentSecurity.md`  
**UI:** `/admin/system/security`

## Tabs

| Tab | Capability |
|-----|------------|
| General | Wave metadata (`gaClaim: false`) |
| Secrets | Pointer to secrets APIs; auto-rotate gate |
| Password Policy | Complexity, expiry, reuse, lockout, history, admin override |
| Session Policy | Idle/absolute timeout, concurrent limit, device tracking, forced logout, audit |
| Rotation | Jobs, schedule, notify, manual/auto run |
| Audit | Filtered governance audit for security actions |
| Certificates | Upload, validate, rotate metadata, expiry status |

## Password & session policies

Stored in existing `security_policies` (Wave 3). Wave 6 merges additive defaults via migration 038 and exposes write paths:

- `PUT /admin/system/security/password`
- `PUT /admin/system/security/session`

Legacy pages `/admin/password-policies` and `/admin/security-policies` remain.

## Secret rotation

- Tables: `secret_rotation_jobs`, `secret_rotation_events`
- APIs under `/admin/system/security/rotation`
- Scheduler emits `expiry.warning`; rotates only when `auto_rotate` **and** `SECRETS_AUTO_ROTATE=true`

## Certificates

- Table: `enterprise_certificates`
- PEM validated via Node `X509Certificate`
- Status: `active` / `expiring` (<30d) / `expired` / `revoked`

## RBAC & audit

Admin role + permission decorators on all Wave 6 routes. Actions written to `governance_audit_events`.
