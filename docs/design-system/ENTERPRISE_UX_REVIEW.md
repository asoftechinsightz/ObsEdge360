# Enterprise UX Review Report — Wave 2.5

**Date:** 2026-07-13  
**Scope:** Executive Dashboard, shell, EIG design system  
**Reviewer:** Engineering (automated audit + code review)

---

## Executive summary

Wave 1–2 established a **single aggregated dashboard API** and **widget-contract rendering**. Wave 2.5 validates that the Executive Home now tells a coherent executive story with consistent EIG components, enterprise information density, and measurable performance improvements.

The platform is **ready for Wave 3 gate review** with minor fixes — not blockers.

---

## Enterprise readiness score

| Dimension | Score | Notes |
|-----------|-------|-------|
| Visual consistency (Executive) | **8.7** | EIG tokens, unified panels, semantic section titles |
| UX / storytelling | **8.5** | Health → status → risks → actions flow |
| Performance | **9.0** | 1 API call, lazy charts, 124 kB FLJS |
| Accessibility | **8.0** | Good landmarks; light theme contrast TBD |
| Demo vitality | **8.5** | Banking pack rich; incident titles generic |
| Scalability (widget engine) | **9.0** | Registry + contracts extensible |
| Platform-wide consistency | **6.5** | Tier-A pages not yet restyled |
| **Overall Executive Dashboard** | **8.6 / 10** | |
| **Overall platform (UI)** | **7.4 / 10** | Until Tier-A + Wave 3 |

---

## Strengths

1. **Single source of truth** — `GET /dashboard/executive` eliminates fan-out and duplicate client fetches  
2. **Widget contracts** — No page-specific JSON; renderers map 1:1 to shared-types  
3. **Layout engine** — `dashboard-layout.ts` decouples position from JSX  
4. **Executive storytelling** — Semantic eyebrows ("Are we within tolerance?") + `StoryBridge`  
5. **Trust indicators** — TrustBar with freshness, source, AI confidence, cache badge  
6. **Enterprise density** — KPI padding tightened (`p-3.5`), `gap-2` grids, compact panels  
7. **Subtle motion** — Page enter 180ms; respects reduced motion  
8. **Telemetry** — API duration, render time, widget timing in sessionStorage  
9. **Domain navigation** — Home / Estate / Observe / Assure / Reports / Administration  
10. **Documentation** — Full design system under `docs/design-system/`

---

## Weaknesses

1. **Tier-A pages** still use mixed patterns (pre-EIG) — breaks "one platform" feel outside `/dashboard`  
2. **Light theme** less polished than dark on some meta text  
3. **Hardcoded priority actions** in client (7 items) — should be backend-only  
4. **Legacy widgets** remain in repo (deprecated but not archived)  
5. **Missing widgets** — Recent changes, upcoming maintenance, explicit root cause panel  
6. **Screenshots** require prod deploy of Wave 1+2 for accurate benchmark  
7. **Permission-denied UI** not yet implemented  
8. **Nav still hardcoded** — entitlements not driving visibility (Wave 3)

---

## Visual consistency audit

| Element | Status | Notes |
|---------|--------|-------|
| Buttons | ✓ Consistent | `Button` primitive + header patterns |
| Cards | ✓ | `kpi-card`, `eig-panel` unified Wave 2.5 |
| Panels | ✓ | `PanelHeader` for intelligence |
| Tables | ✓ | `TableWidgetView` |
| Charts | ✓ | Lazy Recharts from contracts |
| Badges | ✓ | `StatusBadge` only |
| Tabs | ○ | Used on Tier-A, not dashboard |
| Filters | ○ | N/A on executive home |
| Icons | ✓ | Lucide 16–18px in shell |
| Headers | ✓ | Fixed 56px shell header |
| Typography | ✓ | Token scale documented |
| Spacing | ✓ Improved | Wave 2.5 density pass |
| Animations | ✓ | Subtle only |

---

## UX consistency (shell)

| Element | Consistent? |
|---------|-------------|
| Navigation | ✓ Domain sidebar |
| Page titles | ✓ SectionHeader pattern on dashboard |
| Breadcrumbs | ✓ Below header |
| Search | ✓ Header center, Ctrl+K |
| Action buttons | ✓ Header right cluster |
| Status colors | ✓ Backend-driven badges |
| Loading/error/empty | ✓ Documented states |

---

## Dashboard storytelling validation

```
Executive narrative (TrustBar + what/why/impact/next)
        ↓
Executive health (8 KPIs with drill-down)
        ↓
Operational status (9 domain cards)
        ↓
Business risks & intelligence (risks, services, AI, incidents)
        ↓
Recommended actions (deduped action grid)
        ↓
Trend context (charts — supporting evidence)
```

**Verdict:** Pass — reads as a decision workflow, not a widget dump.

---

## Animation review

| Animation | Duration | Verdict |
|-----------|----------|---------|
| Page enter | 180ms | ✓ Subtle |
| Card hover | 180ms shadow | ✓ |
| Shimmer loading | 1.2s | ✓ Only on skeleton |
| Sidebar transition | 200ms margin | ✓ |
| Chart load | Lazy | ✓ No blocking |

No distracting motion identified.

---

## Code quality

- TypeScript: **pass** (`npm run lint`)  
- Production build: **pass** (`npm run build`)  
- Deprecated components marked  
- No `/executive/` calls in dashboard tree  

---

## Future recommendations

See [RECOMMENDATIONS_BEFORE_WAVE_3.md](./RECOMMENDATIONS_BEFORE_WAVE_3.md)

---

## Approval gate

| Criterion | Met? |
|-----------|------|
| Enterprise UX review complete | ✓ |
| Design system documented | ✓ |
| Performance comparison documented | ✓ |
| Accessibility reviewed | ✓ |
| Demo data reviewed | ✓ |
| Technical debt assessed | ✓ |
| Screenshots captured | ○ Run script post-deploy |
| Wave 3 not started | ✓ |

**Recommendation:** Approve Wave 2.5; proceed to Wave 3 after screenshot validation on deployed environment.
