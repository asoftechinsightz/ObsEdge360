# OpsEdge360 — Commercial Launch Package

**Channel:** Commercial / post-RC3 enterprise release prep  
**Baseline:** RC3 `RC3_EPP_VALIDATION_OK` @ `4f39eec`  
**Principle:** Product releases over engineering phases. No new product-family modules until pilots succeed.

| Document | Audience |
|----------|----------|
| [PRODUCTION_RELEASE_PACKAGE.md](./PRODUCTION_RELEASE_PACKAGE.md) | Delivery / partners |
| [CUSTOMER_EVALUATION_PACKAGE.md](./CUSTOMER_EVALUATION_PACKAGE.md) | Sales / SE / prospects |
| [ADMINISTRATOR_GUIDE.md](./ADMINISTRATOR_GUIDE.md) | Customer admins |
| [OPERATOR_GUIDE.md](./OPERATOR_GUIDE.md) | Customer ops |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | Integrators |
| [SUPPORT_HANDBOOK.md](./SUPPORT_HANDBOOK.md) | Support / CS |
| [MAINTENANCE_UPGRADE_GUIDE.md](./MAINTENANCE_UPGRADE_GUIDE.md) | Operators |
| [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md) | Ops / DR |
| [PLATFORM_OBSERVABILITY.md](./PLATFORM_OBSERVABILITY.md) | Ops / SRE |
| [DIAGNOSTICS_BUNDLE.md](./DIAGNOSTICS_BUNDLE.md) | Support |
| [RELEASE_NOTES.md](./RELEASE_NOTES.md) | All |
| [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) | All |
| [PRODUCTION_READINESS_CHECKLIST.md](./PRODUCTION_READINESS_CHECKLIST.md) | Release gate |
| [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) | Leadership / product |
| [SBOM.md](./SBOM.md) | Security / procurement |

## Go-to-market kit

Enterprise Sales & Customer Success Kit: [`docs/gtm/`](../gtm/README.md)  
(Sales, CS, Procurement, Partners, Marketing, business milestones, platform freeze)

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/package-commercial.sh` | Production release tarball |
| `scripts/generate-sbom.sh` | SBOM (lite + commercial path) |
| `scripts/diagnostics-bundle.sh` | Support diagnostics archive |
| `scripts/dr-validate.sh` | Backup/restore/DR attestation |
| `scripts/commercial-validate.sh` | Package completeness check |

## Strong recommendation

Do **not** build SecureEdge360, CloudEdge360, AgentEdge360, or QuantumShield360 yet. Secure 3–5 enterprise pilots, 2–3 production deployments, testimonials, and reference architectures first.

**Engineering Freeze** is in effect: [`docs/ENGINEERING_FREEZE.md`](../ENGINEERING_FREEZE.md).  
Measure business milestones in [`docs/gtm/BUSINESS_MILESTONES.md`](../gtm/BUSINESS_MILESTONES.md).  
Enterprise UX audit: [`docs/ux-audit/`](../ux-audit/README.md).  
Project APEX (product excellence): [`docs/apex/`](../apex/README.md).  
Customer Validation Program: [`docs/cvp/`](../cvp/README.md).
