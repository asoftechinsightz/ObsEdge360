# 07 — Design System Gap Analysis

---

## Design principles (target)

See **[16_EIG_DESIGN_PRINCIPLES.md](./16_EIG_DESIGN_PRINCIPLES.md)** — Enterprise Intelligence Glass (EIG): premium, fast, measurable.

Gaps below are relative to that bar and to Leader-quality references (Azure, Datadog, Dynatrace, Linear, Stripe, Vercel — quality only, not clones).

---

## What exists

| Primitive | Location | Adoption |
|-----------|----------|----------|
| DashboardShell | `components/DashboardShell.tsx` | App chrome |
| AdminShell / AdminNav | `app/admin/*` | Admin only |
| CommandPalette | `components/CommandPalette.tsx` | Partial route list |
| Breadcrumbs | `components/Breadcrumbs.tsx` | Incomplete labels |
| LoadingSkeleton / EmptyState / ErrorState / SuccessBanner | `components/UiStates.tsx` | Sparse |
| KpiGrid / ServiceHealthTable / RiskList / SlaChart | `components/*` | Executive Home |
| CopilotPanel / NotificationCenter / EnvironmentBanner | `components/*` | Header |
| ConnectorWizard | `components/discovery/` | Discovery |
| Tailwind utility classes + `kpi-card` / `nav-link` | `globals.css` | Ad hoc |
| Icons | `lucide-react` | Broad |
| Fonts | Inter / JetBrains claimed in config | Inter load unclear in layout |

---

## Critical gaps (build as shared components — no new product features)

| Component | Why |
|-----------|-----|
| `PageHeader` | Title, purpose, CTAs, meta — consistency |
| `StatusBadge` | healthy/degraded/critical/unknown |
| `DataTable` | Sort/filter/pagination shell |
| `MetricCard` | Generalize KpiGrid item |
| `DescriptionList` | Replace JSON key dumps |
| `Panel` / `Section` | Replace ad-hoc cards |
| `Button` / `IconButton` variants | Primary/secondary/danger |
| `FormField` / `Toggle` | Admin forms |
| `Drawer` / `Modal` / `ConfirmDialog` | Inspectors without new pages |
| `Timeline` | Incidents, failover, upgrades |
| `EmptyState` v2 | Illustration slot + primary/secondary CTA + demo-data action |
| `ErrorBoundary` | Never blank / never stack trace |
| `JsonViewer` | **Debug only** |
| `NavSection` | Grouped sidebar |
| Chart wrappers | Recharts with a11y summary |

---

## Consistency defects

1. Mixed page headers (some rich h1+subtitle; many admin title-only).  
2. Duplicate nav labels / icons reused without meaning.  
3. Tables reinvented per page.  
4. Dark slate aesthetic dominant — OK if tokenized; avoid one-off colors.  
5. Terminology: “Security” vs “Security Center”; “Ops Dashboards” vs “Executive Home”.  
6. Environment banner exposes `APP_ENV=` — prefer human label only in standard mode.

---

## Terminology glossary (standardize)

| Prefer | Avoid in standard UI |
|--------|----------------------|
| Validation passed | `RC2_PILOT_VALIDATION_OK` |
| Release channel | `gaClaim=…` |
| Environment: Staging | `APP_ENV=staging` |
| Technical details | Raw JSON pane by default |
| Service owner | `owner_id` |
| Incident | Unexplained “signal” without glossary |

---

## Design principles (enterprise)

1. Clarity over density theater.  
2. One primary action per view.  
3. Status always scannable in &lt;1s.  
4. Progressive disclosure.  
5. Respect Engineering Freeze — systemize presentation of **existing** capabilities.
