# Recommendations Before Wave 3

Wave 3 introduces Platform Configuration APIs (`/platform/navigation`, `/platform/tenant-config`, `/platform/features`). Do **not** start until these are complete.

## Must complete (gate)

1. **Deploy Wave 1 + 2** to production and verify `/dashboard/executive` returns full payload for demo CIO  
2. **Capture screenshots** — `node scripts/capture-wave25-screenshots.mjs`  
3. **CPO sign-off** on [ENTERPRISE_UX_REVIEW.md](./ENTERPRISE_UX_REVIEW.md) score ≥ 8.5 for Executive Dashboard

## Should fix (Wave 2.5 follow-up or early Wave 3)

| # | Item | Effort |
|---|------|--------|
| 1 | Move `priorityActions` to backend `recommendedActions` | S |
| 2 | Light theme contrast audit on meta text | S |
| 3 | Header icon touch targets ≥ 44px | S |
| 4 | Archive deprecated widgets to `components/legacy/` | S |
| 5 | Named incident seeds in EDE (not "Active incident #N") | M |

## Wave 3 scope (when approved)

1. `GET /platform/tenant-config` — bootstrap (brand, thresholds, modules)  
2. `GET /platform/navigation` — role + license filtered nav  
3. `GET /platform/features` — resolved flags (global → entitlement → tenant → role → user)  
4. Frontend: shell reads config once; **fallback** to static `nav-config.ts`  
5. Opt-in response envelope on new routes only

## Do not do in Wave 3

- Tier-A page full restyle (Wave 4)  
- New product modules  
- SSE widget streaming (Wave 5)  
- Drag-and-drop dashboard editor (Wave 4+)

## Enterprise readiness target post-Wave 3

| Dimension | Current | Target |
|-----------|---------|--------|
| Executive Dashboard | 8.6 | 9.0 |
| Platform UI | 7.4 | 8.0 |
| Config-driven shell | 0% | 100% |

## Sign-off checklist

- [ ] Product owner approves UX review  
- [ ] Screenshots in `docs/design-system/screenshots/`  
- [ ] No regressions on `/executive/*` legacy routes  
- [ ] Demo guided eval completes without empty dashboard  
- [ ] Performance telemetry shows `apiCalls: 1`
