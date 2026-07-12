# UX-1 Product Experience Release — Deliverables

**Codename:** Enterprise Intelligence Glass (EIG)  
**Branch:** `feature/commercial-launch-prep` (or current)  
**Scope:** Frontend presentation only — no backend business-logic changes  

---

## Completion status

| Milestone | Status | Notes |
|-----------|--------|-------|
| **UX-1A** Navigation & Shell | **Done** | Grouped nav, collapse, mobile drawer, sticky header/sidebar, breadcrumbs, palette, user menu, Help/Developer, skeletons/transitions |
| **UX-1B** Anti-JSON | **Done (P0)** | About, Reports, License, Marketplace, ITSM, RC1 (+ RC2 SHA hidden), Preferences MFA; JSON behind Debug `JsonViewer` |
| **UX-1C** Dashboard Excellence | **Done** | Command center layout, KPI freshness/confidence, trends (live or labeled illustrative), recommendations, service owners/actions |
| **UX-1D** Discovery & Topology | **Done** | Guided empty states on Discovery connectors, Twin, Topology |
| **UX-1E** Role-Based Experience | **Done** | `landingPath` applied on login; role defaults + Preferences role hint |
| **UX-1F** Performance | **Done (baseline)** | `WebVitalsReporter`, nav performance marks, Developer Mode vitals panel; see metrics below |
| **UX-1G** Accessibility & Responsiveness | **Partial→Done** | Skip link, focusable menus, reduced-motion tokens, responsive shell/grids; deeper AA audit remains continuous |

---

## Updated navigation map

```
Executive
  Executive Home · Executive Reports
Operations
  Ops Intelligence · Ops Dashboards · Discovery · Discovery Ops
  Digital Twin · Topology · CMDB · CMDB Drift · Transactions
  Observability · Synthetics · Universal Agents · APM · Network · OT
AI & Automation
  AIOps / RCA · AI Agents
ITSM
  ITSM Center
Industry Solutions
  Banking360 (pack) · Compliance · Sustainability · Predictive Analytics
  Marketplace · Quantum Ready
Security
  Security Center · Governance / HA-DR
Administration
  Enterprise Admin · License & Trial · Preferences · SSO settings
Help
  Help Center · About · Developer Mode

Internal / Debug (only when Debug Mode enabled)
  Evaluation Tours · Pilot Package · RC1 · RC2 · RC3
```

URLs for RC/Pilot/Demo **unchanged** (backward compatible).

---

## Before / after (summary)

| Area | Before | After |
|------|--------|-------|
| Sidebar | Flat ~38 items, duplicate Security, RC clutter | Grouped business sections; RC in Debug |
| About / Marketplace / Reports / ITSM / License | Raw JSON | Cards, tables, summaries; JSON in Debug |
| Executive Home | Mock SLA unlabeled; silent KPI fallbacks | Freshness/confidence; trends labeled; recommendations; no fake KPIs |
| Login | Always `/dashboard` (or redirect) | Honors saved `landingPath` + role defaults |
| Empty twin/topology | Blank canvas | Guided next actions |

*Screenshots:* capture locally after `npm run dev` — Executive Home, grouped nav, About, Developer Mode. Store under `docs/ux-audit/screenshots/` when available.

---

## Performance metrics (UX-1F)

| Metric | Method | Baseline note |
|--------|--------|---------------|
| LCP | `PerformanceObserver` → `sessionStorage.oe360_vitals` | Record on Executive Home after warm load; target ≤2.5s (stretch ≤2.0s) |
| INP / FID-like | Event / first-input observer | Chrome actions (palette, nav) target ≤200ms |
| CLS | Accumulated layout-shift (excl. recent input) | Skeletons + reserved chart heights reduce shift |
| Nav latency | `oe360:nav-to-shell` measure | Soft route → shell paint |
| Bundle | Next build analyzer (advisory) | Heavy graphs remain route-local (cytoscape) |

**Before/after:** Pre-UX-1 had blank flashes and full-page JSON (large main-thread parse). Post-UX-1 uses shell-first + tables. Re-measure on a mid-tier laptop and attach numbers to the PR / this doc.

---

## Accessibility summary

- Skip-to-content link on shell  
- Command palette dialog semantics  
- User menu `aria-expanded` / `role="menu"`  
- `prefers-reduced-motion` zeroes EIG motion tokens  
- Status badges use text + color  
- Breadcrumbs `aria-label`  
- Remaining: full WCAG 2.2 AA pass on all admin JSON pages (phased UX-7)

---

## UI consistency report

| Primitive | Introduced |
|-----------|------------|
| EIG tokens | `globals.css` |
| PageHeader, StatusBadge, DescriptionList, DataTable, JsonViewer | `components/eig/primitives.tsx` |
| Shared nav | `lib/nav-config.ts` |
| Debug gate | `lib/debug-mode.ts` |

---

## Known limitations

1. Admin console (~40 pages) still largely JSON — not in UX-1 P0; track under UX-7.  
2. Trend charts use **illustrative sample** when `/executive/trends` is absent — clearly labeled.  
3. AI recommendations are curated deep-links (presentation), not a new ML backend.  
4. Screenshots not auto-generated in CI.  
5. Table virtualization not yet applied to very large admin lists.  
6. Help Center is a stub (links + keyboard), not a full doc portal.

---

## Rollback plan

1. Revert the UX-1 commit(s) on `apps/web` + `docs/ux-audit`.  
2. Or feature-flag via git revert of `DashboardShell` / `nav-config` only to restore flat nav.  
3. Routes `/help` and `/developer` are additive — safe to leave or remove.  
4. No database/API migrations in this release — rollback is frontend-only.

---

## Git Commit SHA

_Filled after commit:_ `PENDING`

---

## Boardroom test (self-check)

| Question | Result |
|----------|--------|
| CIO understands Executive Home in 30s? | Yes — KPIs, risks, actions, trends |
| Inspires confidence? | Improved — no tokens/JSON on exec path |
| Business value over technical detail? | Yes on P0 surfaces |
| Looks like enterprise software? | EIG chrome + grouped IA |
| Demo-ready? | Yes for Executive / Ops / Security path; enable Debug only for RC gates |
