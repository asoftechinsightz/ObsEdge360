# 14 — Priority Matrix

**Axes:** Impact on enterprise perception × Effort (frontend presentation only)

| ID | Item | Impact | Effort | Wave | Freeze fit |
|----|------|--------|--------|------|------------|
| P0-1 | Remove tokens/SHA/gaClaim from standard UI | Critical | S | UX-0/2 | Yes |
| P0-2 | Debug Mode gate for JSON | Critical | M | UX-0 | Yes |
| P0-3 | Nav regroup + dedupe Security + demote RC | Critical | M | UX-1 | Yes |
| P0-4 | Executive SLA truthfulness / badge | Critical | S | UX-3 | Yes |
| P0-5 | Stop silent fake KPI fallbacks | Critical | S | UX-3 | Yes (trust bug) |
| P1-1 | About / Marketplace / License → cards | High | M | UX-2 | Yes |
| P1-2 | Reports / ITSM → tables & previews | High | M | UX-2 | Yes |
| P1-3 | Empty/Error/Loading adoption | High | M | UX-4 | Yes |
| P1-4 | Apply landingPath on login | High | S | UX-1 | Yes (bugfix) |
| P1-5 | Sync Command Palette to nav config | High | S | UX-1 | Yes |
| P1-6 | Breadcrumb dictionary | Med-High | S | UX-1 | Yes |
| P2-1 | PageHeader + StatusBadge + DataTable | High | M | UX-6 | Yes |
| P2-2 | Executive actions / owners / AI rec strip | High | M | UX-3 | Yes |
| P2-3 | Role suggested landings | Med | S | UX-5 | Yes |
| P2-4 | Favorites + Recents | Med | M | UX-5 | Yes |
| P2-5 | Help Center stub | Med | S | UX-1 | Yes |
| P2-6 | Profile menu | Med | S | UX-1 | Yes |
| P2-7 | Typed dashboard widgets | Med-High | M | UX-2/4 | Yes |
| P3-1 | Admin JSON → cards (phased) | Med | L | UX-7 | Yes |
| P3-2 | AdminNav orphans | Med | S | UX-7 | Yes |
| P3-3 | A11y AA on P0 journeys | Med-High | M | UX-6 | Yes |
| P3-4 | Graph legends + list alternate | Med | M | UX-6 | Yes |
| P3-5 | Quantum nav demote | Low | S | UX-1 | Yes |
| X-1 | New product modules / Edge family | — | — | — | **No** |
| X-2 | Backend redesign | — | — | — | **No** |

S ≈ days · M ≈ 1–2 weeks · L ≈ multi-week phased

---

## Quick wins (&lt; 1 week combined)

1. Deduplicate Security nav.  
2. Hide RC/Pilot from default sidebar.  
3. Badge or fix SLA chart.  
4. Remove validation token display from Pilot/RC customer view.  
5. Wire landingPath.  
6. EmptyState on Executive tables when arrays empty.  

These alone materially improve evaluator trust.
