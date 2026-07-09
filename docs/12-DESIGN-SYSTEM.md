# OpsEdge360 — UI/UX Design System

**Version:** 1.0

---

## 1. Design Principles

- **Clarity over density** — Executives see KPIs first; operators drill down
- **Context everywhere** — Every alert links to CI, service, and business impact
- **Dark-first** — Operations centers use dark theme; light mode available
- **Accessible** — WCAG 2.1 AA contrast ratios

## 2. Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--primary` | #0EA5E9 | Actions, links (sky-500) |
| `--accent` | #8B5CF6 | AI/agent features (violet-500) |
| `--success` | #10B981 | Healthy, compliant |
| `--warning` | #F59E0B | Degraded, attention |
| `--danger` | #EF4444 | Critical, violation |
| `--surface` | #0F172A | Background (slate-900) |
| `--surface-elevated` | #1E293B | Cards (slate-800) |
| `--text-primary` | #F8FAFC | Primary text |
| `--text-muted` | #94A3B8 | Secondary text |

## 3. Typography

- **Font**: Inter (UI), JetBrains Mono (code, IDs)
- **Scale**: 12 / 14 / 16 / 20 / 24 / 32 / 40 px

## 4. Components

Built on Tailwind CSS + custom primitives:
- `KpiCard` — metric with trend sparkline
- `HealthBadge` — 0-100 score with color scale
- `CiNode` — digital twin graph node
- `AlertRow` — severity, title, CI link, time
- `ComplianceGauge` — circular framework score
- `TransactionFlow` — horizontal step diagram
- `AgentStatus` — agent run indicator with explainability panel

## 5. Layout

```
┌──────────────────────────────────────────────────────┐
│ Logo │ Global Search │ Alerts │ User │ Tenant Switch  │
├──────────┬───────────────────────────────────────────┤
│ Sidebar  │  Main Content Area                        │
│ - Home   │                                           │
│ - Twin   │                                           │
│ - CMDB   │                                           │
│ - Trans  │                                           │
│ - Obs    │                                           │
│ - Sec    │                                           │
│ - Compl  │                                           │
│ - Exec   │                                           │
└──────────┴───────────────────────────────────────────┘
```

## 6. Iconography

Lucide React icons. Domain colors:
- IT: blue, OT: amber, Network: cyan, Security: red, AI: violet

## 7. Motion

- Subtle fade-in on dashboard load (150ms)
- Graph node pulse on health change
- No distracting animations in alert views

## 8. Implementation

See `apps/web/src/components/ui/` and `apps/web/tailwind.config.ts`.
