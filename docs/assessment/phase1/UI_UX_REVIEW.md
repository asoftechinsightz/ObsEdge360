# OpsEdge360 — UI / UX Review

**Assessment date:** 2026-07-12  
**Surfaces:** `apps/web` (~90 App Router pages)

---

## Summary

The product UI is a **coherent dark operations console** with broad route coverage. It is suitable for technical demos and admin operators. It is **not yet** a premium enterprise experience competitive with Datadog/Dynatrace/ServiceNow front ends on polish, customization, accessibility, or information architecture.

---

## Strengths

- Consistent dark shell (`DashboardShell`) for product modules  
- Strong graph storytelling (Cytoscape) on topology / twin / APM / transactions  
- Executive KPI home with Recharts  
- Admin depth for automation, integrations, certification, RC, GA  
- Auth pages cover login, signup, SSO, password reset  
- Wave 6–9 admin pages introduce light glassmorphism consistently among themselves  

---

## Weaknesses

| Area | Finding |
|------|---------|
| Theme | Dark-only; design docs promise light mode |
| Design system | `docs/12-DESIGN-SYSTEM.md` ahead of code; almost no shared primitives |
| Admin IA | Single wrapping chip strip (~55 links) — unusable at scale |
| Dashboard studio | Widget grid + save; **no drag-and-drop / resize** |
| Chrome | Global search & notifications are non-functional placeholders |
| Role UX | Nav not permission-filtered; no persona-based home |
| Demo UX | No persistent “Demo Environment” banner |
| a11y | Minimal `aria-*`; canvas graphs inaccessible |
| i18n | English only |
| Mobile | Responsive grids exist; not enterprise-mobile certified |
| Messaging | Mixed GA vs “Wave 1” copy in admin chrome |

---

## Route quality samples

| Route | UX note |
|-------|---------|
| `/dashboard` | Solid executive entry |
| `/dashboards/[id]` | Functional but not studio-grade |
| `/admin/*` | Powerful, dense, poorly grouped |
| `/aiops`, `/ops-intelligence` | Credible AIOps story |
| `/banking360` | Best vertical polish |
| `/ot` | Exists; depth not industrial-grade |

---

## Target UX principles (for later implementation)

1. One composition per viewport; reduce chip clutter  
2. Group Admin into: Platform · Security · Automation · Integrations · Reliability · Release  
3. Environment banner (Demo/UAT/Prod) always visible  
4. Design tokens + 8–12 primitives before new page chrome  
5. Dashboard DnD only after studio data model stable  
6. WCAG 2.1 AA as gate for marketing/demo surfaces first  

---

## Priority UX backlog

| Priority | Item |
|----------|------|
| P0 | Environment / Demo banner |
| P0 | Remove or disable fake notification badge |
| P1 | Admin nav regroup |
| P1 | Role-aware landing pages for demo personas |
| P1 | Light mode tokens |
| P2 | Drag-drop dashboards |
| P2 | a11y pass on auth + executive home |
| P3 | i18n framework |

**Do not** redesign the entire shell before Demo isolation and synthetic monitoring foundations.
