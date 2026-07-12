# OpsEdge360 — Technical Debt

**Assessment date:** 2026-07-12  
**Baseline:** `4222b45` GA-validated tip

---

## Severity scale

- **Critical** — production risk or security/tenancy hazard  
- **High** — blocks enterprise claims or slows every wave  
- **Medium** — maintainability / cost of change  
- **Low** — polish

---

## Critical / High

| ID | Debt | Why it matters | Mitigation |
|----|------|----------------|------------|
| TD-01 | No isolated Demo environment | Demo actions can touch prod paths; sales risk | Phase 2 demo isolation |
| TD-02 | Silent UI mock / demo ingest fallbacks | Can overstate health | Gate behind `DEMO_MODE` only |
| TD-03 | Helm ≠ full Compose service set | K8s installs incomplete vs VPS | Expand chart incrementally |
| TD-04 | Cloud secrets providers stubbed | Enterprise secret manager RFPs fail | Implement AWS/Azure/GCP providers behind existing interface |
| TD-05 | No browser e2e suite | Regressions caught late (ops scripts only) | Add Playwright smoke for login + 5 critical paths |

---

## Medium

| ID | Debt | Notes |
|----|------|-------|
| TD-06 | Dual visual dialects (plain cards vs glass admin) | Consolidate design tokens |
| TD-07 | Flat AdminNav (~55 chips) | IA debt; slows operators |
| TD-08 | Design system docs without `components/ui` | Docs lie to implementers |
| TD-09 | Experimental services (scheduler, config-mgmt) not in prod | Document as lab or promote |
| TD-10 | Migration numbering gap (no 002) | Harmless but confusing |
| TD-11 | Client-side JWT decode for display name | Prefer `/auth/me` only |
| TD-12 | Header search / notifications placeholders | Remove or implement |
| TD-13 | OpenAPI version/docs drift risk | Keep Wave8/9 export in CI |
| TD-14 | Legacy Trinetra Helm stub | Mark deprecated / remove from docs |
| TD-15 | Quantum / sustainability surfaces | Product ambiguity — keep labeled experimental or fold |

---

## Low

| ID | Debt |
|----|------|
| TD-16 | Encoding glitches in some phase5 markdown (`â€"`) |
| TD-17 | Duplicate Radar icons in product nav |
| TD-18 | Admin subtitle still mentioning early Wave in places |
| TD-19 | `.env.sample` naming inconsistency (`.env.example` used) |
| TD-20 | Bundle artifacts (`*.bundle`) untracked in workspace clutter |

---

## Positive debt hygiene

- Classic `TODO`/`FIXME` density in `apps/api-gateway` and `services/**` is **effectively zero**  
- Additive migrations and wave gates reduce “big bang rewrite” pressure  
- AuthZ and audit paths are tested more than average for this stage  

---

## Debt burn-down order (recommended)

1. TD-01 / TD-02 with Demo Phase  
2. TD-05 Playwright smoke  
3. TD-07 Admin IA  
4. TD-08 Design system primitives  
5. TD-03 / TD-04 as packaging/security track  
6. Remaining medium/low in UX waves
