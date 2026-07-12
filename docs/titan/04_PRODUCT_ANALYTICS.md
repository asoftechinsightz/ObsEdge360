# 04 — Workstream 4: Product Analytics (Privacy-Safe)

**Goal:** Measure adoption and operations effectiveness **customers approve** — no personal profiling.

## Allowed metric classes

| Class | Examples | Collection |
|-------|----------|------------|
| Feature adoption | Page views by route (aggregated) | CVP analytics |
| Workflow completion | Report generate counts, correlate/RCA actions (aggregated) | CVP counters / ops logs |
| Dashboard usage | Exec KPI clicks, time-on-page aggregates | CVP analytics |
| Search success | Palette search terms (aggregated, truncated) | CVP analytics |
| Time-to-resolution | From ITSM/CVP feedback timestamps | Manual/CS + ITSM |
| Copilot usage | Opens, messages, inline AI runs | CVP analytics |
| Alert acknowledgment time | Security/ops workflows | Process metric via ITSM |

## Explicitly out of scope

- Individual user behavioral profiles  
- Keystroke / content surveillance  
- Cross-customer identity graphs  

## Governance

1. Disclose analytics in DPA / pilot SOW as needed.  
2. Prefer on-tenant / local aggregate store (current CVP analytics) unless customer mandates central telemetry.  
3. Export only with customer permission.  

See `/admin/cvp/analytics` and `apps/web/src/lib/cvp/analytics.ts`.
