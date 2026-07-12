# Security Questionnaire — Standard Responses

> Customize per RFP. Prefer linking evidence over vague claims.

| Topic | Response summary | Evidence |
|-------|------------------|----------|
| Authentication | Local accounts + SSO (OIDC/SAML); MFA TOTP with backup codes; MFA enforceable at login | RC2/RC3 auth docs |
| Secrets at rest | MFA secrets AES-256-GCM via `SECRETS_MASTER_KEY` | RC3 security assessment |
| Session control | Sessions carry JWT `jti`; revoke invalidates access | RC3 validation |
| Authorization | RBAC/ABAC lineage; `AUTHZ_ENFORCE` | Wave security docs |
| Audit logging | Dual-layer audit + login_history | Phase/Wave docs |
| Encryption in transit | TLS at edge (customer certs / nginx) | Deploy guides |
| Vulnerability mgmt | SBOM + CI Trivy/SPDX path | `generate-sbom.sh`, CI |
| Data residency | On-prem / customer VPC / air-gap supported patterns | Commercial package |
| Soft deletes / tenancy | Tenant isolation model | Architecture overview |
| Pen test | Customer-led; we support scoping + remediation SLAs | Support handbook |
| Lab MFA codes | Disabled by default; unsupported on customer prod | Known issues |

## Attachments checklist

- [ ] SBOM JSON  
- [ ] Network diagram (customer-filled)  
- [ ] Data flow  
- [ ] HA topology choice  
- [ ] Known limitations acknowledgment  

**Prepared by:** _____________ **Date:** _____________
