# Accessibility Report — Wave 2.5

**Scope:** Executive Dashboard + shell  
**Standard target:** WCAG 2.1 AA (enterprise baseline)

## Strengths

| Area | Implementation |
|------|----------------|
| Skip link | `#main-content` in `DashboardShell` |
| Landmarks | `<main>`, `<nav aria-label="Primary">`, `<section aria-labelledby>` |
| Section headings | `SectionHeader` with stable `id` attributes |
| Status | `TrustBar` uses `role="status"` |
| Alerts | `DashboardErrorState` uses `role="alert"` |
| Loading | `aria-busy` on skeleton |
| Decorative charts | Sparklines `aria-hidden` |
| KPI links | `aria-label` with value + trend |
| Reduced motion | CSS disables animations |
| Focus | `kpi-card:focus-visible` outline added Wave 2.5 |

## Gaps (fix in Wave 3 or Tier-A pass)

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| Light theme contrast on `text-slate-500` meta | Medium | Audit 4.5:1 on `--surface` light |
| Command palette focus trap | Medium | Verify roving tabindex |
| Table sort/filter keyboard | Low | When TanStack tables land |
| `role` display in header meta | Low | Consider `sr-only` for API ms |
| Incident list generic titles | Low | Backend richer incident names |
| Touch targets <44px on some header icons | Medium | Increase padding to `p-2.5` min |

## Keyboard navigation

| Control | Shortcut / behavior |
|---------|---------------------|
| Command palette | Ctrl+K |
| Skip to content | Tab first focus |
| Sidebar links | Tab order logical |
| KPI cards | Tab → Enter navigates |
| Copilot | Button focusable |

## Responsive

| Breakpoint | Behavior |
|------------|----------|
| Desktop 1440px | 4-col KPI, 3-col domains, 12-col intelligence |
| Laptop 1280px | Same with tighter gutters |
| Tablet | Stacks intelligence columns |
| Mobile | Hamburger nav; KPI 2-col |

## Screen reader flow

1. Page title → TrustBar status  
2. Executive narrative (what/why/impact/next)  
3. Section headings in story order  
4. KPI grid (linked cards announce label)  
5. Intelligence panels with table headers  

## Score: **8.0 / 10** (Executive Dashboard)

Platform-wide a11y lower until Tier-A pages restyled.
