# 17 — UX Performance Measurement (Non-Negotiable)

**Rule:** Measure every UI change. A beautiful interface that feels slow fails enterprise expectations. Target: **premium-looking and genuinely responsive**.

---

## What to track

| Category | Metrics |
|----------|---------|
| Page load | TTFB, FCP, **LCP**, time-to-shell, time-to-meaningful-KPI |
| Interaction | **INP**, click-to-paint, nav transition duration |
| Stability | **CLS** |
| Bundle | Route JS size, shared chunk size, lazy-chunk count |
| Network | API p50/p95 latency, waterfalls, duplicate/in-flight calls |
| Runtime | Long tasks (&gt;50ms), main-thread blocking during nav |

---

## Budgets (v1 targets)

| Metric | Budget | Notes |
|--------|--------|-------|
| LCP (exec home, warm cache) | ≤ 2.5s (stretch ≤ 2.0s) | “Under 2s where practical” |
| INP (P75) | ≤ 200ms | Prefer ≤ 150ms on chrome actions |
| CLS | ≤ 0.1 | No skeleton→content jump without reserved space |
| Soft navigation | ≤ 150ms to paint new header + skeleton | Data may arrive later |
| Primary API (P95) | Track & regress-alert | UX owns calling pattern; API team owns backend |
| Exec route JS (gzip) | Establish baseline in UX-1; no +15% silent growth | Lazy-load graphs/admin |

Budgets may be tightened after first pilot telemetry—not loosened without Product note.

---

## Instrumentation plan (freeze-safe)

1. **Web Vitals** — `web-vitals` (or Next.js analytics hook) reporting LCP/INP/CLS to existing logging/telemetry endpoint if present; else console/debug beacon in non-prod.  
2. **Navigation marks** — `performance.mark` on route change start/shell-ready/data-ready.  
3. **API client wrapper** — count duplicate GETs; expose slow-call badge in Debug Mode only.  
4. **Bundle report** — `next build` analyzer on CI for web app (advisory gate).  
5. **Checklist in PR** — link before/after LCP/INP/bundle for UX PRs.

Do not block customers with visible “perf debug” overlays in standard mode.

---

## Engineering practices that serve the budgets

| Practice | Why |
|----------|-----|
| Shell-first render | Nav feels instant |
| Skeletons with fixed min-heights | Protect CLS |
| Lazy-load Cytoscape / heavy admin | Protect LCP/INP |
| Virtualize long tables | Protect INP |
| SWR/React Query–style cache (if already in stack) or light in-memory cache | Fewer duplicate calls |
| Background revalidate | Fresh without spinners |
| Optimistic UI for safe toggles | Perceived speed |
| `prefers-reduced-motion` | A11y + less main-thread work |
| Restrained glass blur | GPU cost |

---

## Definition of done (perf)

A UX change is not complete until:

- [ ] Budgets checked on the touched route(s)  
- [ ] No new full-page wait spinner replacing skeleton  
- [ ] No new unbounded JSON render on business views  
- [ ] Bundle delta noted if route imports new heavy deps  
- [ ] Boardroom feel validated on mid-tier laptop, not only 4K workstation  

---

## Relationship to UX waves

| Wave | Measurement focus |
|------|-------------------|
| UX-1 | Shell nav INP, soft-nav marks, baseline vitals |
| UX-2 | Anti-JSON pages LCP (cards vs giant pre) |
| UX-3 | Executive Home LCP + KPI time-to-meaningful |
| UX-4 | Skeleton CLS across catalog |
| UX-6+ | Design-system component cost, chart lazy load |
