# Wave 8 — Administrator Guide

## Admin surfaces

| Area | Path |
|------|------|
| System Security | `/admin/system/security` |
| Certification Center | `/admin/system/certification` |
| Release Candidate | `/admin/system/release-candidate` (API) / Admin nav RC page |
| Ops Health | `/admin/ops-health` |
| Integrations | `/admin/integrations` |

## Daily ops

- Monitor `/api/v1/health` and container health
- Review governance audit for security/certification actions
- Keep backup certifications current
- Do not enable `SECRETS_AUTO_ROTATE` without change control
