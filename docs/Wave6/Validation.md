# Wave 6 — Validation

**Script:** `scripts/vps-p5-wave6-validate.sh`  
**Token:** `P5_WAVE6_VALIDATION_OK`

## Coverage

| Check | Evidence |
|-------|----------|
| Air-gap | register + verify package API |
| Kubernetes | deployment profiles + Helm feature list |
| Backup | schedule + certify |
| Restore | attest certification |
| Secret rotation | create job + optional run |
| Password policies | PUT password policy |
| Session policies | PUT session policy |
| Certificates | upload valid PEM + validate |
| Security UI APIs | `/admin/system/security` |
| Ops health | `/admin/ops-health` |
| Migration 038 | `secret_rotation_jobs` table |
| Documentation | `docs/Wave6` present on host |
| RBAC | unauthenticated 401/403 |
| Audit | security audit endpoint |
| Production smoke | health 200 |
| Helm chart | Chart.yaml version wave6 |
| Scripts | airgap + backup-certify executable |

Does **not** claim `P5_GA_VALIDATION_OK` or tag `v1.0.0`.
