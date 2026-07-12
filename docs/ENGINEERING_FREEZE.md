# OpsEdge360 v1.0 Enterprise Platform

## Status: Engineering Freeze

**Effective:** 2026-07-12  
**Baseline:** v1.0.0 GA + RC3 Enterprise Pilot Ready + Commercial Launch Prep  
**Policy owner:** Product  

Core platform engineering is **frozen**. New work is restricted to the allow-list below. Everything else requires **Product Approval** before design or implementation starts.

---

## Only allowed

| Category | Scope | Gate |
|----------|--------|------|
| Critical bugs | Auth/data/install outages, severity-1 correctness defects | Bug triage → fix |
| Security updates | CVE patches, secret/auth hardening, dependency risk | Security review → fix |
| Performance improvements | Latency, throughput, pool/soak issues from pilots or prod | Measured regression → fix |
| Customer-requested enhancements | Scoped items from signed pilots / SOWs / paying customers | Product + CS confirm → implement |

## Everything else

Requires **Product Approval** (written), including but not limited to:

- New modules, domains, or industry packs without a customer sponsor  
- Speculative UX redesigns or architecture rewrites  
- New Edge-family products (SecureEdge360, CloudEdge360, AgentEdge360, QuantumShield360, LeadEdge360, RetailEdge360, etc.)  
- “Nice to have” features without pilot/production evidence  
- Major version capability work labeled v2.0 before business milestones

## How to request Product Approval

1. State the customer / pilot / security driver.  
2. Define outcome, scope, and non-goals.  
3. Estimate risk to freeze (regression, ops load).  
4. Get Product written approval before branching for the work.

## Redirect capacity to

1. AsoftechInsightz brand and GTM  
2. Landing enterprise pilots  
3. Sales, CS, procurement, and partner assets ([`docs/gtm/`](./gtm/README.md))  
4. Customer feedback loops  
5. Enterprise UX polish per [`docs/ux-audit/`](./ux-audit/README.md) and APEX [`docs/apex/`](./apex/README.md)  
6. Customer Validation Program [`docs/cvp/`](./cvp/README.md) — pilots, feedback, evidence-driven v1.1  
7. v1.1 only from real-world usage  

## Unfreeze criteria

Major R&D unfreezes only against [business milestones](./gtm/BUSINESS_MILESTONES.md) — not engineering wave completion.

Related: [Platform freeze (GTM)](./gtm/PLATFORM_FREEZE.md) · [Commercial roadmap](./commercial/PRODUCT_ROADMAP.md)
