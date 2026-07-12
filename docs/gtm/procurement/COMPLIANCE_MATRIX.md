# Compliance Matrix

| Control area | OpsEdge360 support | Notes |
|--------------|-------------------|-------|
| Access control | SSO, MFA, RBAC | Enforce MFA for production-like |
| Auditability | Audit events, login history | Export/SIEM depth varies |
| Encryption | TLS; MFA secret encryption | Disk encryption = customer OS |
| Change management | Git SHA deploy; upgrade guides | Customer CAB process |
| Backup/DR | Scripts + DR validate | RTO/RPO per SOW |
| Secure SDLC | CI, SBOM, Trivy path | Pen test customer-scoped |
| Industry packs | Banking360 (RBI/PCI-oriented controls UI) | Not a certification substitute |
| Data residency | Customer-hosted | No mandatory AsoftechInsightz SaaS |

**Important:** Product features assist compliance programs; they do not replace customer certifications (ISO, SOC2, PCI QSA, etc.).
