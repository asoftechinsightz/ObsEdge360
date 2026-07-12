# 11 — Implementation Plan

**Constraint:** Engineering Freeze — UX / presentation / IA only. No backend redesign. No feature creep. Product Approval for anything outside allow-list (customer-requested counts as allow-list).

---

## Waves

### UX-0 — Policy & guardrails (1–2 days)

- Adopt anti-JSON rule in ENGINEERING_FREEZE / UX docs (done in this pack).  
- Add `Debug Mode` flag (user pref or `?debug=1` / admin role) — presentation gate only.  
- Define single nav config module (sidebar + palette share data).

### UX-1 — Navigation & chrome + EIG foundation (1–2 weeks)

**Design bar:** [16_EIG_DESIGN_PRINCIPLES.md](./16_EIG_DESIGN_PRINCIPLES.md)  
**Measurement bar:** [17_UX_PERFORMANCE_MEASUREMENT.md](./17_UX_PERFORMANCE_MEASUREMENT.md)  
**Sign-off:** [ENTERPRISE_QUALITY_CHECKLIST.md](./ENTERPRISE_QUALITY_CHECKLIST.md)

- Grouped sidebar sections (EIG rail); remove duplicate Security.  
- Move RC1/RC2/RC3/Pilot out of default nav → Debug / Admin › Release.  
- Breadcrumb label dictionary completeness.  
- Profile menu; Help stub page (content from `docs/`).  
- Apply `landingPath` on login (**bugfix**).  
- Shared nav source for sidebar + command palette.  
- Shell-first render + content skeletons (no blank flash).  
- EIG tokens in CSS (radius 8–12, 8px grid, restrained glass, motion 150–250ms).  
- Baseline Web Vitals / nav performance marks for the shell.  
- Soft hover / drawer motion only; honor `prefers-reduced-motion`.

**Exit criteria:** Chrome passes boardroom test; nav feels instant; RC clutter gone; vitals baseline recorded.

### UX-2 — Anti-JSON P0 surfaces (2–3 weeks)

Priority conversion (map existing fields → cards/tables):

1. About  
2. Marketplace  
3. License & Trial (`/commercial`)  
4. Reports  
5. ITSM  
6. Preferences MFA panel  
7. Admin home (remove gaClaim raw)  
8. RC pages (Debug-only presentation)

Introduce `JsonViewer` for Debug only; `DescriptionList` + `DataTable` for standard.

### UX-3 — Executive Home truthfulness (1 week)

- Replace or clearly badge mock SLA.  
- Remove silent KPI numeric fallbacks → ErrorState.  
- Add owner + recommended action columns/links.  
- Recommendations strip (deep links / Copilot).  

### UX-4 — Empty / error / loading (1–2 weeks)

- Adopt UiStates on all product pages.  
- ErrorBoundary at shell.  
- Guided empty CTAs (demo tour, connect discovery, create synthetic).  
- Never show stack traces / raw 500 text.

### UX-5 — Role emphasis (1 week)

- Role → suggested landing.  
- Optional nav section ordering.  
- Favorites + Recents (client persistence).

### UX-6 — Design system + a11y (ongoing)

- PageHeader, StatusBadge, DataTable, Drawer, Button.  
- WCAG AA on P0 journeys.  
- Chart text summaries; graph list alternate.

### UX-7 — Admin console uplift (phased)

- Convert admin JSON pages group-by-group (Platform → Security → Reliability → Integrations → Automation).  
- Add orphan routes into AdminNav.

---

## Definition of done (per page)

- [ ] PageHeader with purpose + primary CTA  
- [ ] No raw JSON/tokens/SHA in standard mode  
- [ ] EmptyState / ErrorState / LoadingSkeleton  
- [ ] Breadcrumb label humanized  
- [ ] Keyboard reach primary actions  
- [ ] Debug link optional for technical payload  

---

## Resourcing suggestion

| Role | Focus |
|------|--------|
| UX lead | IA, exec narrative, design tokens |
| FE engineer(s) | Shell, anti-JSON mapping, primitives |
| CS / Sales | Validate eval tour + exec demo path |
| Product | Approve exceptions; prioritize customer-requested |

---

## Explicit non-goals

- New modules, Edge products, speculative packs  
- Backend schema redesigns  
- Pixel-perfect clones of Datadog/Azure
