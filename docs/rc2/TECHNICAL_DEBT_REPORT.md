# Technical Debt Report — RC2

**Policy:** Refactor only where justified for pilot readiness. No rewrite of stable modules.

| ID | Item | Severity | Disposition |
|----|------|----------|-------------|
| D-01 | Duplicate MFA enroll paths (`/me/mfa/enroll` vs `/me/mfa/enroll-totp`) | Low | Keep both; RC2 path is production; Phase4 lab-gated |
| D-02 | Wave6 admin sessions vs RC2 Security Center | Low | Aggregate in RC2; Wave6 preserved |
| D-03 | JWT not bound to `user_sessions.id` | Medium | Residual — backlog denylist/`jti` |
| D-04 | `secret_enc` plaintext | Medium | Residual — encrypt-at-rest backlog |
| D-05 | Helm chart covers gateway/web subset | Medium | Documented limitation A-12 |
| D-06 | npm audit high findings in transitive deps | Medium | Monitor; Trivy CI; no blanket major upgrades in RC2 |
| D-07 | Fat `Rc2Service` mixing branding/demo/perf/security | Low | Acceptable for RC2; split post-pilot if needed |
| D-08 | Modeled performance ≠ live soak | Info | Honest labeling; Wave7 remains CERT path |
| D-09 | Legacy JWT secret default string | Low | Production fail-closed; rename default post-RC2 |
| D-10 | Terraform cluster name still `trinetra360` | Low | Branding note only |

## Explicitly not done

- Broad dependency upgrades  
- Dead-code sweep across Waves 1–9  
- Helm microservice expansion  
- Chromium browser worker
