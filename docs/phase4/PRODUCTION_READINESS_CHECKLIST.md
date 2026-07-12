# Production Readiness Checklist — RC1

| Gate | Criteria | Status |
|------|----------|--------|
| Build / typecheck | API + web tsc clean | Required |
| Security headers | nosniff, frame deny, HSTS prod | Required |
| MFA | Policy + enroll/verify available | Required |
| SSO / LDAP | Existing OIDC/SAML/LDAP paths live | Required |
| HA artifacts | compose.ha, Helm HPA/PDB, Wave7 | Required |
| Deployment | Compose, Helm, air-gap scripts | Required |
| Integrations | Matrix published | Required |
| Reporting | Generate + CSV/JSON | Required |
| Documentation | docs/phase4 pack | Required |
| Demo | ≥5 industry tours | Required |
| Commercial | Trial + entitlements | Required |
| Validation | `P4_RC1_MARKET_VALIDATION_OK` | Required |
| Backward compatibility | GA/Phase2/Phase3 APIs | Required |

Do not declare RC1 complete without the validation token and zero critical defects.
