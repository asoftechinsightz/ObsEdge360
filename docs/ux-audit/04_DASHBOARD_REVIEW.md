# 04 — Dashboard Review

Every dashboard must answer:

1. What is happening?  
2. Why is it happening?  
3. Business impact?  
4. Revenue impact?  
5. SLA impact?  
6. Who owns it?  
7. Recommended action?  
8. Expected outcome?

---

## Executive Home (`/dashboard`)

| Question | Today | Gap |
|----------|-------|-----|
| What | KPI cards + service table + risks | Partial |
| Why | Risks list only | No causal narrative / drill |
| Business impact | Implied via services | Weak linking |
| Revenue | “Revenue at Risk” KPI | Needs definition + drill |
| SLA | Chart present | **Mock data** — trust breaker |
| Owner | Missing | Add service owner column / link |
| Action | Missing | “Open incident”, “Ask Copilot”, “View report” |
| Outcome | Missing | “If mitigated → SLA recovers to X” |

**Redesign (UX only):** Keep layout. Replace mock SLA with API/series or honest “Sample preview” badge. Add **AI recommendations** strip (from existing Copilot/ops APIs if available; else contextual links). Add owner + next action columns. Never silently fall back to invented KPI numbers—show ErrorState + Retry.

Score: **Executive 3.0 · Trust 1.5 · Actionability 2.0**

---

## Ops Intelligence (`/ops-intelligence`)

Strongest operational dashboard: incidents, anomalies, RCA, remediation, forecasts.

| Question | Status |
|----------|--------|
| What / Why | Good for ops; light on business $ |
| Owner / Action | Improve with assignee + runbook links (ITSM already exists) |
| Empty / error | Ensure EmptyState / ErrorState |

Score: **Operational 4.0 · Executive 2.5**

---

## Ops Dashboards (`/dashboards`, `/dashboards/[id]`)

Configurable NOC value is high. Widget payload truncated JSON is not Leader-grade.

**Fix:** Typed widget renderers (KPI, table, timeseries, status) mapping existing payload fields; “View raw” only in Debug.

Score: **Operational 3.5 · Presentation 2.0**

---

## Admin Platform Dashboard (`/admin`)

Useful counts; polluted by `releaseTrack` / `gaClaim` developer strings.

**Fix:** Business labels (“Release channel: GA”) without claim tokens; move certification dumps to Release section cards.

Score: **Admin 3.0 · Enterprise polish 2.0**

---

## Compliance / Sustainability / Banking360 / Analytics

Present as domain dashboards. Ensure each leads with posture KPI + top violations/opportunities + owner + recommended action—not raw framework dumps.

---

## Dashboard design standard (adopt)

```
┌─────────────────────────────────────────────────────────┐
│ Title · Purpose · Time range · Last updated · Actions   │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│ KPI      │ KPI      │ KPI      │ KPI      │ KPI         │
├──────────┴──────────┴──────────┼──────────┴─────────────┤
│ Primary narrative (table/graph)│ Risks / Recommendations│
├────────────────────────────────┴────────────────────────┤
│ Trend / Timeline                                         │
└─────────────────────────────────────────────────────────┘
```

Mandatory footer link: **Export** · **Open in API Explorer (Debug)** — never default to JSON body.
