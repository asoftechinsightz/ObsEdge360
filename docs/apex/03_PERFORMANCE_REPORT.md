# 03 — Performance Report

## Targets (EIG / UX-1F)

| Metric | Budget |
|--------|--------|
| LCP | ≤ 2.5s (stretch ≤ 2.0s) |
| INP P75 | ≤ 200ms |
| CLS | ≤ 0.1 |
| Soft nav → shell | ≤ 150ms |

## What APEX changed

| Change | Effect |
|--------|--------|
| Presentation mode hides non-essential chrome | Less paint / less distraction |
| Shimmer skeletons (`eig-shimmer`) | Better perceived load; reserved height |
| Inline AI on-demand (not auto-fetch) | No LCP regression from AI |
| Route performance marks retained | `oe360:nav-to-shell` |
| WebVitalsReporter | Session LCP/INP/CLS in Developer Mode |

## Before / after (method)

1. Open Executive Home cold + warm.  
2. Read `sessionStorage.oe360_vitals` or Developer Mode panel.  
3. Compare soft-nav marks in Performance timeline.

**Lab note:** Absolute numbers depend on host/API. APEX does not claim synthetic Lighthouse scores without CI. Pilot hosts should attach measured values here.

| Route | LCP warm (fill) | INP (fill) | CLS (fill) |
|-------|----------------:|-----------:|-----------:|
| /dashboard | | | |
| /ops-intelligence | | | |
| /security | | | |

## Non-goals

No micro-optimization that reduces maintainability. Cytoscape remains lazy to its routes.
