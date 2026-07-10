# Technical Debt Register

**Document ID:** OE360-TDR-001  
**Status:** LIVING  
**Last updated:** 2026-07-10  
**Owner:** Chief Architect  

Track debt that is accepted short-term but must be resolved. Link to Risk Register when debt creates material risk.

| ID | Description | Priority | Risk | Owner | Planned resolution | Status |
|----|-------------|----------|------|-------|--------------------|--------|
| TD-001 | JWT cookie `oe360_token` not HttpOnly (JS-readable) | High | XSS → session theft | Security Architect | Phase 2 (ADR-008 / ADR-009) | Open |
| TD-002 | RBAC library present but not enforced at gateway | High | Broken access control | Security Architect | Phase 2 (ADR-010) | Open |
| TD-003 | Tenant isolation not validated end-to-end | High | Cross-tenant data exposure | Security Architect | Phase 2 (ADR-011) | Open |
| TD-004 | Redis / Kafka auth residual (if unauthenticated in env) | Medium | Lateral movement | SRE | Phase 2 / Phase 6 | Open |
| TD-005 | Scheduler & config-mgmt experimental (not in prod) | Low | Feature incomplete | Architect | Later phase after ADR revisit | Accepted (ADR-003 B) |
| TD-006 | AI agents rule-based stubs (not LLM-grounded) | Medium | Misleading “AI” claims | Product | Phase 4 | Open |
| TD-007 | Helm chart values without templates | Medium | No K8s install path | SRE | Phase 6 | Open |
| TD-008 | CI without full CD pipeline | Medium | Manual deploy risk | SRE | Phase 6 | Open |
| TD-009 | Shared-security package underused | Medium | Duplicated auth logic | Architect | Phase 2 | Open |
| TD-010 | Audit logging not comprehensive on mutations | High | Compliance / forensics gap | Security | Phase 2 (ADR-013) | Open |
| TD-011 | Secrets only via host `.env` (no Vault/KMS) | Medium | Secret sprawl | SRE | Phase 2 foundation (ADR-014); Phase 6 Vault | Open |
| TD-012 | Banking360 still default-on via env flag | Low | Pack boundary soft | Product | Phase 5 pack model | Open |
| TD-013 | Gateway health probes vs true deep checks | Low | False healthy | SRE | Phase 3 | Open |
| TD-014 | Alerts / on-call not fully verified | Medium | MTTD/MTTR | SRE | Phase 1 PRR / Phase 3 | Open |

## How to add

1. Assign next `TD-NNN`  
2. Set Priority: Critical · High · Medium · Low  
3. Link Risk ID if applicable  
4. Name owner and target phase  
5. Close only when verified in code + docs  

## Review cadence

Update at every phase exit and PRR.
