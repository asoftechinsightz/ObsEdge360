# OpsEdge360 — Industry Solution Packs (Frozen Policy)

**Document ID:** OE360-PACKS-FROZEN-001  
**Status:** FROZEN  
**Effective:** 2026-07-10  
**Decision origin:** Phase 0 approval modification — Banking360 as optional pack  

---

## 1. Policy statement

OpsEdge360 is a **globally deployable, industry-agnostic enterprise platform**.

Vertical capabilities are delivered exclusively as **Solution Packs**:

- Banking360  
- Retail360  
- Healthcare360  
- Manufacturing360  
- Telecom360, Government360, Education360, Energy360, Logistics360, Hospitality360, Aviation360, Automotive360, SaaS360, Agriculture360 (future)

Country/regulatory overlays are **Compliance Packs** (orthogonal to industry packs).

---

## 2. Why Banking360 is not core

| If Banking360 were core | Consequence |
|-------------------------|-------------|
| Required services/UI for all tenants | Blocks non-BFSI customers |
| BFSI flows in shared boot path | Couples releases to banking roadmap |
| Hardcoded UPI/NEFT assumptions | Poor fit for healthcare/manufacturing/gov |
| Duplicate “platform per industry” | Violates DRY / global product goal |

**Decision:** Banking360 is an **optional Solution Pack**. Core must run with Banking360 disabled.

---

## 3. Pack contract (target model)

```
Tenant
  └── enabled_packs: ["banking360"] | [] | ["healthcare360", "india-compliance"]
        └── PackManifest
              ├── id, version, dependencies
              ├── ci_types / tags extensions
              ├── compliance_rules / controls
              ├── dashboard_templates
              ├── transaction_classifications
              ├── connectors (optional)
              └── ui_modules (routes, nav entries)
```

### Runtime rules

1. Gateway and core services start without any pack.
2. Pack features gated by tenant entitlement / `enabled_packs`.
3. Pack uninstall removes pack UI and rules; retains core CIs unless pack-owned.
4. No pack may patch core tables without versioned, additive migrations owned by pack namespace (future).

---

## 4. Current-state vs target

| Area | Current state | Target |
|------|---------------|--------|
| `/banking360` UI | Always in nav | Show only if pack enabled |
| `payment_flow_templates` / banking controls | In core DB migrations | Treat as pack-owned data; core remains usable if unused |
| Compliance service `/banking360/*` | Core service routes | Namespace under pack router or feature flag |
| Seeds | Demo BFSI-heavy | Separate pack seed profiles |

**Phase 1:** Document + soft-decouple (nav/feature flag design ADR).  
**Phase 5:** Full pack marketplace enablement UX.

---

## 5. Compliance packs (countries)

India, USA, UK, EU, Singapore, Australia, UAE, Japan, Global Standards — metadata/rule-driven; combinable with any industry pack.

---

## 6. Acceptance for “industry-agnostic core”

- [ ] Fresh tenant with **no packs** can use discovery, CMDB, observability, security posture, compliance engine (generic frameworks).
- [ ] Banking360 can be enabled without redeploying unrelated core images (Phase 5+; Phase 1 documents the path).
- [ ] No required dependency from `api-gateway` boot to Banking360 controllers.
