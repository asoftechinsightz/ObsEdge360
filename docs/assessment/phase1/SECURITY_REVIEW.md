# OpsEdge360 — Security Review

**Assessment date:** 2026-07-12  
**Scope:** AuthN/Z, tenancy, secrets, mesh, audit, edge, integrations

---

## Overall posture

**Good for an enterprise GA candidate** on the Compose/VPS path: AuthZ enforce-by-default, tenant mismatch controls, secrets store, service identity/mTLS, dual-layer audit, and Wave 6–7 security certification surfaces.

**Not complete** for every enterprise RFP: MFA missing, cloud KMS providers stubbed, Demo/Prod isolation incomplete, vulnerability management missing.

---

## Controls present

| Control | Status | Notes |
|---------|--------|-------|
| JWT auth + refresh | Present | Weak secret blocked in production |
| RBAC permissions | Present | DB roles preferred when assigned |
| ABAC | Present | Tenant policies |
| Tenant isolation | Present | Header spoof → mismatch rejection + audit |
| Auth rate limit | Present | Login/integrations paths |
| SSO OIDC/SAML | Present | |
| LDAP/AD | Partial | Via integrations |
| Secrets encryption + versions | Present | Local provider |
| Secret rotation jobs | Present | Auto-rotate gated |
| Service JWT | Present | |
| SPIFFE / SVID mTLS | Present | CMDB path emphasized |
| Security observability | Present | Events/rules/alerts |
| Dual-layer audit / legal hold | Present | |
| Password / session policies | Present | Wave 3/6 admin |
| Edge TLS (nginx) | Present | Prod |
| Trivy in CI | Present | CRITICAL+HIGH |
| AUTHZ_ENFORCE prod default | Present | Helm + deploy script |

---

## Gaps / risks

| Risk | Severity | Recommendation |
|------|----------|----------------|
| No MFA | High (RFP) | TOTP then WebAuthn |
| Demo can share prod plane | High | Dedicated demo DB + outbound kill-switch |
| Cloud secrets stubs | Medium | Implement provider adapters |
| Client JWT decode for UI name | Low | Use `/auth/me` |
| `AUTH_REQUIRED=false` bypass | Medium | Forbid in prod compose profiles |
| Destructive integrations in demo | High if demo shared | Disable email/SMS/ticket/webhook in demo |
| Vulnerability / CVE module absent | Medium | Add SecOps track |
| Browser e2e for auth flows absent | Medium | Playwright login/SSO smoke |
| Public discovery/UA enroll endpoints | Medium | Keep attested + rate-limited; review periodically |

---

## Threat model highlights

1. **Cross-tenant read/write** — mitigated by gateway resolution + proxy header policy; keep tests green.  
2. **Privilege escalation via permission inference** — `inferPermission` + `@RequirePermission`; continue matrix certification (Wave 7).  
3. **Secret exfiltration** — prefer short-lived service credentials; rotation jobs.  
4. **Supply chain** — CI Trivy + SBOM-lite; expand to full CycloneDX in packaging track.  
5. **OT remediation safety** — keep zone gates; never auto-execute OT without policy.

---

## Compliance mapping (honest)

| Framework | Platform support |
|-----------|------------------|
| SOC 2 / ISO 27001 evidence | Audit + access control foundations; full certification is process + customer env |
| PCI / HIPAA / GDPR | Packs/controls partial; not a substitute for QSA/BAAs |
| NIST / CIS | Framework entities exist; continuous scoring uneven |
| IEC 62443 | OT connectors help; full OT security suite missing |

---

## Security backlog priority

1. Demo outbound + data isolation  
2. MFA  
3. Cloud KMS providers  
4. Vulnerability management MVP  
5. Auth Playwright + periodic AuthZ matrix automation in CI
